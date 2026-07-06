import { DomainError, type DomainErrorCode } from '@my-little-pony/core';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

// Maps internal (English) domain error codes to an HTTP status and a pt-BR
// message shown to the user. Keeps presentation strings out of the domain.
const MAP: Record<DomainErrorCode, { status: number; message: string }> = {
  'invalid-name': { status: HttpStatus.BAD_REQUEST, message: 'Informe um nome válido.' },
  'invalid-email': { status: HttpStatus.BAD_REQUEST, message: 'Confira o e-mail digitado.' },
  'weak-password': {
    status: HttpStatus.BAD_REQUEST,
    message: 'A senha precisa ter ao menos 8 caracteres.',
  },
  'email-taken': { status: HttpStatus.CONFLICT, message: 'Este e-mail já está em uso.' },
  'bad-credentials': { status: HttpStatus.UNAUTHORIZED, message: 'E-mail ou senha incorretos.' },
  'stale-token': {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Sua sessão expirou. Entre novamente.',
  },
  'user-not-found': { status: HttpStatus.NOT_FOUND, message: 'Usuário não encontrado.' },
  'invalid-image': {
    status: HttpStatus.BAD_REQUEST,
    message: 'Envie uma imagem válida (até 5 MB).',
  },
  'document-not-found': { status: HttpStatus.NOT_FOUND, message: 'Documento não encontrado.' },
  forbidden: { status: HttpStatus.FORBIDDEN, message: 'Você não tem acesso a este documento.' },
  'stale-version': {
    status: HttpStatus.CONFLICT,
    message: 'O documento foi alterado em outro lugar. Recarregue e tente de novo.',
  },
  'slug-taken': { status: HttpStatus.CONFLICT, message: 'Este endereço (slug) já está em uso.' },
  'invalid-contact': {
    status: HttpStatus.BAD_REQUEST,
    message: 'Confira o nome, o e-mail e a mensagem.',
  },
  'invalid-page-config': {
    status: HttpStatus.BAD_REQUEST,
    message: 'Confira as opções de página (papel, orientação, margens ou cores).',
  },
  'invalid-token-scope': {
    status: HttpStatus.BAD_REQUEST,
    message: 'Selecione ao menos um escopo válido para o token.',
  },
  'invalid-token': {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Token de acesso inválido ou expirado.',
  },
  'insufficient-scope': {
    status: HttpStatus.FORBIDDEN,
    message: 'Este token não tem permissão para esta ação.',
  },
};

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const mapped = MAP[error.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Algo deu errado.',
    };
    if (mapped.status >= 500) this.logger.error(`Unmapped domain error: ${error.code}`);
    response.status(mapped.status).json({
      statusCode: mapped.status,
      code: error.code,
      message: mapped.message,
    });
  }
}
