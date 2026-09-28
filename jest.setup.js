// jest.setup.js
require('@testing-library/jest-dom');

// Mock @inertiajs/react globally with DOM attribute filtering
jest.mock('@inertiajs/react', () => {
    const React = require('react');
    return {
        Link: (allProps) => {
            const {
                children,
                href,
                className,
                dangerouslySetInnerHTML,
                as: Component = 'a',
            } = allProps;

            const nonDomKeys = ['preserveState', 'preserveScroll', 'only', 'replace', 'as'];
            const domProps = Object.keys(allProps)
                .filter(
                    (key) =>
                        !nonDomKeys.includes(key) &&
                        key !== 'children' &&
                        key !== 'href' &&
                        key !== 'className' &&
                        key !== 'dangerouslySetInnerHTML',
                )
                .reduce((acc, key) => {
                    acc[key] = allProps[key];
                    return acc;
                }, {});

            if (dangerouslySetInnerHTML) {
                return React.createElement(Component, {
                    href,
                    className,
                    dangerouslySetInnerHTML,
                    ...domProps,
                });
            }
            return React.createElement(
                Component,
                {
                    href,
                    className,
                    ...domProps,
                },
                children,
            );
        },
        usePage: jest.fn(() => ({
            props: {
                auth: { user: null },
                errors: {},
                flash: {},
            },
            url: '/',
            component: '',
            version: null,
        })),
        useForm: jest.fn((initialValues = {}) => ({
            data: initialValues,
            setData: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
            processing: false,
            errors: {},
            clearErrors: jest.fn(),
            reset: jest.fn(),
            hasErrors: false,
            isDirty: false,
        })),
        router: {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
            reload: jest.fn(),
            visit: jest.fn(),
            prefetch: jest.fn(),
        },
        Head: ({ children }) => children || null,
    };
});

// Manual cookie mock management
exports.storedCookies = {};

Object.defineProperty(window.document, 'cookie', {
    get: function () {
        return Object.entries(exports.storedCookies)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');
    },
    set: function (cookieString) {
        const parts = cookieString.split(';').map((s) => s.trim());
        const firstPart = parts[0];
        const eqIndex = firstPart.indexOf('=');

        let name, value;
        if (eqIndex > -1) {
            name = firstPart.substring(0, eqIndex);
            value = firstPart.substring(eqIndex + 1);
        } else {
            name = firstPart;
            value = ''; // No value, treat as empty
        }

        const isDeletion = cookieString.includes('expires=Thu, 01 Jan 1970');

        if (isDeletion) {
            delete exports.storedCookies[name.trim()];
        } else if (name && value !== undefined) {
            exports.storedCookies[name.trim()] = value;
        }
    },
    configurable: true,
});

beforeEach(() => {
    for (const key in exports.storedCookies) {
        delete exports.storedCookies[key];
    }
});

global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
        return [];
    }
};

if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = function () {};
}

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});
