import assert from 'node:assert/strict';
import test from 'node:test';
import { readBlogQuota } from './blog-quota.ts';
test('unknown or invalid quota never pretends to be twenty remaining',()=>{
    const quota={limit:20,used:7,remaining:13,day:'2026-10-23',resetsAt:'2026-10-23T16:00:00Z'};
    assert.deepEqual(readBlogQuota(quota),quota);
    for(const value of [null,{}, {...quota,remaining:20},{...quota,used:-1},{...quota,resetsAt:'invalid'}])
        assert.equal(readBlogQuota(value),null);
});
