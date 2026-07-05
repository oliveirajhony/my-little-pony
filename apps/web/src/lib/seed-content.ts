/**
 * Corpo (HTML) dos documentos-semente. Mora fora do `mock-data` para manter
 * aquele arquivo enxuto. É o conteúdo que o leitor read-only pagina em folhas
 * A4 na página pública. Quando o backend existir, isto vem do servidor.
 */
export const SEED_CONTENT: Record<string, string> = {
  d1: `
    <h1>Guia de boas práticas de escrita</h1>
    <p>Escrever bem não é escrever bonito — é escrever de um jeito que a pessoa
    do outro lado entenda rápido, sem esforço. Este guia reúne princípios que
    valem para qualquer texto de trabalho: um e-mail, uma documentação, uma
    página de produto.</p>
    <h2>Voz ativa</h2>
    <p>A voz ativa deixa claro quem faz o quê. "O time revisou o documento" lê
    melhor que "o documento foi revisado pelo time". Reserve a voz passiva para
    quando o autor da ação não importa.</p>
    <h2>Frases curtas</h2>
    <p>Uma ideia por frase. Quando uma frase começa a acumular vírgulas e
    "poréns", quebre-a em duas. O leitor respira, e o sentido fica.</p>
    <p>Corte advérbios que não carregam informação. "Muito", "realmente" e
    "basicamente" quase sempre podem sair sem prejuízo.</p>
    <h2>Hierarquia da informação</h2>
    <p>Comece pelo que importa. O leitor decide nos primeiros segundos se
    continua. Coloque a conclusão no topo e os detalhes embaixo — a chamada
    pirâmide invertida.</p>
    <ul>
      <li>Um título diz do que se trata.</li>
      <li>Um subtítulo orienta a leitura em diagonal.</li>
      <li>Listas organizam itens paralelos.</li>
    </ul>
    <h2>Revisão</h2>
    <p>Todo texto melhora na segunda passada. Leia em voz alta: onde você
    tropeça, o leitor também tropeça. Onde falta ar, falta pontuação. E, no
    fim, tire um acessório — quase sempre há uma palavra a menos.</p>
    <p>Boa escrita é generosa: ela poupa o tempo de quem lê. Esse é o objetivo.</p>
  `,
  d2: `
    <h1>Roadmap do produto — Q3</h1>
    <p>Documento vivo, atualizado às sextas. Aqui ficam as prioridades do
    trimestre, os marcos e o que decidimos deixar para depois.</p>
    <h2>Prioridades</h2>
    <p>O foco do trimestre é a experiência de quem publica um documento e
    compartilha o link. Tudo que reduz atrito nesse caminho sobe na lista.</p>
    <ul>
      <li>Página pública do documento com leitura polida.</li>
      <li>Exportar e receber por e-mail.</li>
      <li>Melhorias de performance no editor.</li>
    </ul>
    <h2>Marcos</h2>
    <p>Cada marco tem um responsável e uma data-alvo. Datas são estimativas de
    boa-fé, não promessas — quando algo muda, o documento muda junto.</p>
    <h2>Fica para depois</h2>
    <p>Colaboração em tempo real e comentários entram no radar do próximo
    trimestre. Registrar aqui evita retrabalho de discussão.</p>
  `,
  d3: `
    <h1>Notas da reunião de design</h1>
    <p>Decisões sobre o novo editor, pendências e responsáveis. Os links dos
    protótipos estão ao final.</p>
    <h2>Decisões</h2>
    <ul>
      <li>O documento começa no topo; metadados vão para um painel lateral.</li>
      <li>Barra de ferramentas fixa; apenas o canvas rola.</li>
      <li>Tema claro é o protagonista; escuro no toggle.</li>
    </ul>
    <h2>Pendências</h2>
    <p>Validar a paginação em telas pequenas e revisar os estados de
    carregamento. Responsáveis definidos na retro.</p>
    <h2>Próximos passos</h2>
    <p>Fechar a página pública do documento e revisitar o fluxo de publicação
    ponta a ponta antes da próxima demo.</p>
  `,
  d4: `
    <h1>Política de privacidade</h1>
    <p>Como tratamos os dados dos usuários, a base legal e os seus direitos.
    Documento revisado pelo jurídico.</p>
    <h2>Dados que coletamos</h2>
    <p>Coletamos apenas o necessário para o serviço funcionar: dados de conta e
    o conteúdo que você cria. Não vendemos dados a terceiros.</p>
    <h2>Base legal</h2>
    <p>O tratamento se apoia na execução do contrato e no seu consentimento,
    conforme a legislação aplicável.</p>
    <h2>Seus direitos</h2>
    <ul>
      <li>Acessar e corrigir seus dados.</li>
      <li>Exportar o que é seu.</li>
      <li>Solicitar a exclusão da conta.</li>
    </ul>
  `,
  d6: `
    <h1>Onboarding de novos membros</h1>
    <p>Passo a passo para quem entra no time: acessos, ferramentas e a cultura
    de escrita que nos mantém alinhados.</p>
    <h2>Primeiro dia</h2>
    <ul>
      <li>Configurar acessos e o gerenciador de senhas.</li>
      <li>Entrar nos canais principais.</li>
      <li>Ler o guia de boas práticas de escrita.</li>
    </ul>
    <h2>Primeira semana</h2>
    <p>Pareie com alguém do time em uma tarefa real. Pergunte cedo e muito —
    perguntar é sinal de cuidado, não de desconhecimento.</p>
    <h2>Cultura</h2>
    <p>Escrevemos as decisões. Um documento curto hoje evita uma reunião longa
    amanhã.</p>
  `,
};
