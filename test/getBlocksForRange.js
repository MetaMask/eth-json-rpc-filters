const sinon = require("sinon");
const test = require("tape");

const getBlocksForRange = require("../getBlocksForRange");

test("return block number if there is no error", async (t) => {
  const sendAsync = sinon
    .stub()
    .withArgs({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: ["0x1", false],
    })
    .onCall(0)
    .callsArgWith(1, null, { result: "0x5c377193f05cb9aa0f44bcc77d05492f" });
  const provider = { sendAsync };
  try {
    const result = await getBlocksForRange({
      provider,
      fromBlock: "0x1",
      toBlock: "0x1",
    });
    t.deepEquals(result, ["0x5c377193f05cb9aa0f44bcc77d05492f"]);
  } catch (error) {
    t.fail("Should not throw error if result is obtained");
  }
  t.end();
});

test("looks for a block number 3 times until throwing", async (t) => {
  const sendAsync = sinon
    .stub()
    .withArgs({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: ["0x1", false],
    })
    .onCall(0)
    .callsArgWith(1, new Error("some error"), null)
    .onCall(1)
    .callsArgWith(1, null, { error: "some error" })
    .onCall(2)
    .callsArgWith(1, null, { result: null });
  const provider = { sendAsync };
  try {
    await getBlocksForRange({ provider, fromBlock: "0x1", toBlock: "0x1" });
    t.fail("Promise resolved when it was not supposed to");
  } catch (error) {
    t.equal(error.message, "Block not found for params: 0x1,false");
  }
  t.end();
});
