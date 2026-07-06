import asyncio

from rag_service.adapters.inbound.stream_guard import QueueFullError, SingleFlightGuard


def test_serializes_and_reports_position():
    async def scenario():
        guard = SingleFlightGuard(limit=1, max_depth=8, max_wait_s=5.0)
        order = []

        async def worker(name):
            async with guard.slot() as position:
                order.append((name, position))
                await asyncio.sleep(0.05)

        await asyncio.gather(worker("a"), worker("b"))
        return dict(order)

    positions = asyncio.run(scenario())
    assert positions["a"] == 0
    assert positions["b"] >= 1


def test_rejects_when_queue_full():
    async def scenario():
        guard = SingleFlightGuard(limit=1, max_depth=0, max_wait_s=5.0)

        async def hold():
            async with guard.slot():
                await asyncio.sleep(0.1)

        holder = asyncio.create_task(hold())
        await asyncio.sleep(0.01)
        raised = False
        try:
            async with guard.slot():
                pass
        except QueueFullError:
            raised = True
        await holder
        return raised

    assert asyncio.run(scenario()) is True
