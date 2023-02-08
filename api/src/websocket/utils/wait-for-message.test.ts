import { expect, describe, test, vi } from 'vitest';
import { waitForAnyMessage, waitForMessageType } from './wait-for-message';
import type { WebSocket, RawData } from 'ws';

function bufferMessage(msg: any): RawData {
	return Buffer.from(JSON.stringify(msg));
}

function mockClient(handler: (callback: (event: RawData) => void) => void) {
	return {
		on: vi.fn().mockImplementation((type: string, callback: (event: RawData) => void) => {
			if (type === 'message') handler(callback);
		}),
		off: vi.fn(),
	} as unknown as WebSocket;
}

describe('Wait for messages', () => {
	test('should succeed, 5ms delay, 10ms timeout', async () => {
		const TEST_TIMEOUT = 10;
		const TEST_MSG = { type: 'test', id: 1 };
		const fakeClient = mockClient((callback) => {
			setTimeout(() => {
				callback(bufferMessage(TEST_MSG));
			}, 5);
		});
		const msg = await waitForAnyMessage(fakeClient, TEST_TIMEOUT);

		expect(msg).toStrictEqual(TEST_MSG);
	});
	test('should fail, 10ms delay, 5ms timeout', async () => {
		const TEST_TIMEOUT = 5;
		const TEST_MSG = { type: 'test', id: 1 };
		const fakeClient = mockClient((callback) => {
			setTimeout(() => {
				callback(bufferMessage(TEST_MSG));
			}, 10);
		});
		expect(() => waitForAnyMessage(fakeClient, TEST_TIMEOUT)).rejects.toBe(undefined);
	});
});

describe('Wait for specific types messages', () => {
	const MSG_A = { type: 'test', id: 1 };
	const MSG_B = { type: 'other', id: 2 };
	test('should find the correct message', async () => {
		const fakeClient = mockClient((callback) => {
			setTimeout(() => callback(bufferMessage(MSG_B)), 5);
			setTimeout(() => callback(bufferMessage(MSG_A)), 10);
		});
		const msg = await waitForMessageType(fakeClient, 'test', 15);

		expect(msg).toStrictEqual(MSG_A);
	});
	test('should fail, no matching type', async () => {
		const fakeClient = mockClient((callback) => {
			setTimeout(() => {
				callback(bufferMessage(MSG_B));
			}, 5);
		});
		expect(() => waitForMessageType(fakeClient, 'test', 10)).rejects.toBe(undefined);
	});
});