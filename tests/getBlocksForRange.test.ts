import { describe, expect, it, vi } from 'vitest'
import type { InternalProvider } from '@metamask/eth-json-rpc-provider'
import { getBlocksForRange } from '../src/getBlocksForRange.js'

describe('getBlocksForRange', () => {
  it('returns the block if there is no error', async () => {
    const request = vi.fn().mockReturnValueOnce('0x5c377193f05cb9aa0f44bcc77d05492f')

    const result = await getBlocksForRange({
      provider: { request } as unknown as InternalProvider,
      fromBlock: '0x1',
      toBlock: '0x1',
    })

    expect(result).toStrictEqual(['0x5c377193f05cb9aa0f44bcc77d05492f'])
    expect(request).toHaveBeenCalledWith({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: ['0x1', false],
    })
  })

  it('does not throw if the request fails, and filters out null', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const request = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('some error')
      })
      .mockReturnValueOnce(null)

    const result = await getBlocksForRange({
      provider: { request } as unknown as InternalProvider,
      fromBlock: '0x1',
      toBlock: '0x1',
    })

    expect(result).toStrictEqual([])
    expect(request).toHaveBeenCalledTimes(2)
  })
})
