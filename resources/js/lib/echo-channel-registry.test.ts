import {
    __resetEchoChannelRegistryForTests,
    acquirePrivateChannel,
    acquirePublicChannel,
    handleEchoVisibilityChange,
    releasePrivateChannel,
    releasePublicChannel,
} from './echo-channel-registry';

describe('echo-channel-registry', () => {
    let mockChannel: jest.Mock;
    let mockPrivate: jest.Mock;
    let mockLeave: jest.Mock;
    let mockListen: jest.Mock;
    let mockStopListening: jest.Mock;
    let mockNotification: jest.Mock;

    beforeEach(() => {
        __resetEchoChannelRegistryForTests();

        mockListen = jest.fn();
        mockStopListening = jest.fn();
        mockNotification = jest.fn();

        mockChannel = jest.fn(() => ({
            listen: mockListen,
            stopListening: mockStopListening,
        }));

        mockPrivate = jest.fn(() => ({
            listen: mockListen,
            stopListening: mockStopListening,
            notification: mockNotification,
        }));

        mockLeave = jest.fn();

        Object.defineProperty(window, 'Echo', {
            value: {
                channel: mockChannel,
                private: mockPrivate,
                leave: mockLeave,
            },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete (window as unknown as { Echo?: unknown }).Echo;
    });

    describe('acquirePublicChannel', () => {
        it('should call window.Echo.channel only once for multiple acquisitions of the same channel', () => {
            const channel1 = acquirePublicChannel('test-channel');

            const channel2 = acquirePublicChannel('test-channel');

            expect(mockChannel).toHaveBeenCalledTimes(1);
            expect(mockChannel).toHaveBeenCalledWith('test-channel');
            expect(channel1).toBe(channel2);
        });

        it('should return undefined and not create a channel entry if window.Echo is undefined', () => {
            delete (window as unknown as { Echo?: unknown }).Echo;

            const channel = acquirePublicChannel('test-channel');

            expect(channel).toBeUndefined();
            expect(mockChannel).not.toHaveBeenCalled();
        });

        it('should handle different public channel names independently', () => {
            const channel1 = acquirePublicChannel('channel-1');

            const channel2 = acquirePublicChannel('channel-2');

            expect(mockChannel).toHaveBeenCalledTimes(2);
            expect(mockChannel).toHaveBeenNthCalledWith(1, 'channel-1');
            expect(mockChannel).toHaveBeenNthCalledWith(2, 'channel-2');
            expect(channel1).not.toBe(channel2);
        });
    });

    describe('releasePublicChannel', () => {
        it('should not call window.Echo.leave if refCount is greater than 1', () => {
            acquirePublicChannel('test-channel');
            acquirePublicChannel('test-channel');

            releasePublicChannel('test-channel');

            expect(mockLeave).not.toHaveBeenCalled();
        });

        it('should call window.Echo.leave when refCount reaches 0', () => {
            acquirePublicChannel('test-channel');
            acquirePublicChannel('test-channel');

            releasePublicChannel('test-channel');
            releasePublicChannel('test-channel');

            expect(mockLeave).toHaveBeenCalledTimes(1);
            expect(mockLeave).toHaveBeenCalledWith('test-channel');
        });

        it('should allow re-acquiring a channel after it has been fully released', () => {
            const channel1 = acquirePublicChannel('test-channel');
            releasePublicChannel('test-channel');

            // Reset mocks to verify new acquisition
            mockChannel.mockClear();

            const channel2 = acquirePublicChannel('test-channel');

            expect(mockChannel).toHaveBeenCalledTimes(1);
            expect(channel1).not.toBe(channel2);
        });

        it('should be a no-op if channel does not exist in registry', () => {
            expect(() => {
                releasePublicChannel('non-existent-channel');
            }).not.toThrow();

            expect(mockLeave).not.toHaveBeenCalled();
        });
    });

    describe('acquirePrivateChannel', () => {
        it('should call window.Echo.private only once for multiple acquisitions of the same channel', () => {
            const channel1 = acquirePrivateChannel('App.Models.User.1');

            const channel2 = acquirePrivateChannel('App.Models.User.1');

            expect(mockPrivate).toHaveBeenCalledTimes(1);
            expect(mockPrivate).toHaveBeenCalledWith('App.Models.User.1');
            expect(channel1).toBe(channel2);
        });

        it('should return undefined and not create a channel entry if window.Echo is undefined', () => {
            delete (window as unknown as { Echo?: unknown }).Echo;

            const channel = acquirePrivateChannel('App.Models.User.1');

            expect(channel).toBeUndefined();
            expect(mockPrivate).not.toHaveBeenCalled();
        });

        it('should handle different private channel names independently', () => {
            const channel1 = acquirePrivateChannel('App.Models.User.1');

            const channel2 = acquirePrivateChannel('App.Models.User.2');

            expect(mockPrivate).toHaveBeenCalledTimes(2);
            expect(mockPrivate).toHaveBeenNthCalledWith(1, 'App.Models.User.1');
            expect(mockPrivate).toHaveBeenNthCalledWith(2, 'App.Models.User.2');
            expect(channel1).not.toBe(channel2);
        });
    });

    describe('releasePrivateChannel', () => {
        it('should not call window.Echo.leave if refCount is greater than 1', () => {
            acquirePrivateChannel('App.Models.User.1');
            acquirePrivateChannel('App.Models.User.1');

            releasePrivateChannel('App.Models.User.1');

            expect(mockLeave).not.toHaveBeenCalled();
        });

        it('should call window.Echo.leave when refCount reaches 0', () => {
            acquirePrivateChannel('App.Models.User.1');
            acquirePrivateChannel('App.Models.User.1');

            releasePrivateChannel('App.Models.User.1');
            releasePrivateChannel('App.Models.User.1');

            expect(mockLeave).toHaveBeenCalledTimes(1);
            expect(mockLeave).toHaveBeenCalledWith('App.Models.User.1');
        });

        it('should allow re-acquiring a channel after it has been fully released', () => {
            const channel1 = acquirePrivateChannel('App.Models.User.1');
            releasePrivateChannel('App.Models.User.1');

            mockPrivate.mockClear();

            const channel2 = acquirePrivateChannel('App.Models.User.1');

            expect(mockPrivate).toHaveBeenCalledTimes(1);
            expect(channel1).not.toBe(channel2);
        });

        it('should be a no-op if channel does not exist in registry', () => {
            expect(() => {
                releasePrivateChannel('non-existent-channel');
            }).not.toThrow();

            expect(mockLeave).not.toHaveBeenCalled();
        });
    });

    describe('mixed public and private channels', () => {
        it('should handle public and private channels with the same name independently', () => {
            const publicChannel = acquirePublicChannel('same-name');

            const privateChannel = acquirePrivateChannel('same-name');

            expect(mockChannel).toHaveBeenCalledWith('same-name');
            expect(mockPrivate).toHaveBeenCalledWith('same-name');
            expect(publicChannel).not.toBe(privateChannel);
        });

        it('should release public and private channels independently', () => {
            acquirePublicChannel('same-name');
            acquirePrivateChannel('same-name');

            releasePublicChannel('same-name');

            // mockLeave should only have been called for the public channel
            expect(mockLeave).toHaveBeenCalledTimes(1);
            expect(mockLeave).toHaveBeenCalledWith('same-name');

            // Second call for private channel
            releasePrivateChannel('same-name');

            expect(mockLeave).toHaveBeenCalledTimes(2);
        });
    });

    describe('__resetEchoChannelRegistryForTests', () => {
        it('should clear all channel references', () => {
            acquirePublicChannel('channel-1');
            acquirePrivateChannel('channel-2');

            __resetEchoChannelRegistryForTests();
            mockChannel.mockClear();
            mockPrivate.mockClear();

            // Acquire the same channels again and verify they are created fresh
            acquirePublicChannel('channel-1');
            acquirePrivateChannel('channel-2');

            expect(mockChannel).toHaveBeenCalledTimes(1);
            expect(mockPrivate).toHaveBeenCalledTimes(1);
        });
    });
    describe('handleEchoVisibilityChange and visibilitychange listener', () => {
        it('should call pusher.connect when document is visible and connection is closed', () => {
            const mockConnect = jest.fn();
            const mockIsOpen = jest.fn().mockReturnValue(false);

            Object.defineProperty(window, 'Echo', {
                value: {
                    connector: {
                        pusher: {
                            connection: {
                                isOpen: mockIsOpen,
                            },
                            connect: mockConnect,
                        },
                    },
                },
                writable: true,
                configurable: true,
            });

            Object.defineProperty(document, 'visibilityState', {
                value: 'visible',
                writable: true,
                configurable: true,
            });

            handleEchoVisibilityChange();

            expect(mockIsOpen).toHaveBeenCalled();
            expect(mockConnect).toHaveBeenCalledTimes(1);
        });

        it('should not call pusher.connect when document is visible but connection is already open', () => {
            const mockConnect = jest.fn();
            const mockIsOpen = jest.fn().mockReturnValue(true);

            Object.defineProperty(window, 'Echo', {
                value: {
                    connector: {
                        pusher: {
                            connection: {
                                isOpen: mockIsOpen,
                            },
                            connect: mockConnect,
                        },
                    },
                },
                writable: true,
                configurable: true,
            });

            Object.defineProperty(document, 'visibilityState', {
                value: 'visible',
                writable: true,
                configurable: true,
            });

            handleEchoVisibilityChange();

            expect(mockIsOpen).toHaveBeenCalled();
            expect(mockConnect).not.toHaveBeenCalled();
        });

        it('should not call pusher.connect when document is hidden', () => {
            const mockConnect = jest.fn();
            const mockIsOpen = jest.fn().mockReturnValue(false);

            Object.defineProperty(window, 'Echo', {
                value: {
                    connector: {
                        pusher: {
                            connection: {
                                isOpen: mockIsOpen,
                            },
                            connect: mockConnect,
                        },
                    },
                },
                writable: true,
                configurable: true,
            });

            Object.defineProperty(document, 'visibilityState', {
                value: 'hidden',
                writable: true,
                configurable: true,
            });

            handleEchoVisibilityChange();

            expect(mockConnect).not.toHaveBeenCalled();
        });

        it('should trigger reconnection when visibilitychange event is fired on document', () => {
            const mockConnect = jest.fn();
            const mockIsOpen = jest.fn().mockReturnValue(false);

            Object.defineProperty(window, 'Echo', {
                value: {
                    connector: {
                        pusher: {
                            connection: {
                                isOpen: mockIsOpen,
                            },
                            connect: mockConnect,
                        },
                    },
                },
                writable: true,
                configurable: true,
            });

            Object.defineProperty(document, 'visibilityState', {
                value: 'visible',
                writable: true,
                configurable: true,
            });

            document.dispatchEvent(new Event('visibilitychange'));

            expect(mockConnect).toHaveBeenCalledTimes(1);
        });
    });
});
