import { renderHook, act } from '@testing-library/react';
import { useNotificationAudio } from './useNotificationAudio';

describe('useNotificationAudio', () => {
    let mockVibrate: jest.Mock;
    let mockAudioContext: jest.Mock;
    let mockOscillator: {
        type: string;
        frequency: {
            setValueAtTime: jest.Mock;
            exponentialRampToValueAtTime: jest.Mock;
        };
        connect: jest.Mock;
        start: jest.Mock;
        stop: jest.Mock;
    };
    let mockGain: {
        gain: {
            setValueAtTime: jest.Mock;
            exponentialRampToValueAtTime: jest.Mock;
        };
        connect: jest.Mock;
    };

    beforeEach(() => {
        mockVibrate = jest.fn();
        Object.defineProperty(navigator, 'vibrate', {
            value: (pattern: number | number[]) => {
                mockVibrate(pattern);
                return true;
            },
            configurable: true,
            writable: true,
        });

        mockOscillator = {
            type: '',
            frequency: {
                setValueAtTime: jest.fn(),
                exponentialRampToValueAtTime: jest.fn(),
            },
            connect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
        };

        mockGain = {
            gain: {
                setValueAtTime: jest.fn(),
                exponentialRampToValueAtTime: jest.fn(),
            },
            connect: jest.fn(),
        };

        mockAudioContext = jest.fn().mockImplementation(() => ({
            currentTime: 0,
            destination: {},
            createOscillator: () => mockOscillator,
            createGain: () => mockGain,
        }));

        Object.defineProperty(window, 'AudioContext', {
            value: mockAudioContext,
            configurable: true,
            writable: true,
        });
    });

    it('triggers haptic vibration and synthesizes audio on playNotificationFeedback', () => {
        const { result } = renderHook(() => useNotificationAudio());

        act(() => {
            result.current.playNotificationFeedback();
        });

        expect(mockVibrate).toHaveBeenCalledWith(50);
        expect(mockAudioContext).toHaveBeenCalledTimes(1);
        expect(mockOscillator.type).toBe('sine');
        expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(587.33, 0);
        expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(880, 0.15);
        expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.08, 0);
        expect(mockGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 0.25);
        expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain);
        expect(mockGain.connect).toHaveBeenCalled();
        expect(mockOscillator.start).toHaveBeenCalled();
        expect(mockOscillator.stop).toHaveBeenCalledWith(0.25);
    });

    it('handles vibration failure gracefully without throwing', () => {
        mockVibrate.mockImplementation(() => {
            throw new Error('Vibration permission denied');
        });

        const { result } = renderHook(() => useNotificationAudio());

        expect(() => {
            act(() => {
                result.current.playNotificationFeedback();
            });
        }).not.toThrow();
    });

    it('handles audio synthesis failure or autoplay block gracefully without throwing', () => {
        mockAudioContext.mockImplementation(() => {
            throw new Error('Autoplay policy blocked AudioContext');
        });

        const { result } = renderHook(() => useNotificationAudio());

        expect(() => {
            act(() => {
                result.current.playNotificationFeedback();
            });
        }).not.toThrow();
    });
});
