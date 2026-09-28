import { render, screen } from '@testing-library/react';
import { TrendIndicatorBadge } from './TrendIndicatorBadge';
import { MetricTrendIndicator } from './MetricTrendIndicator';

describe('TrendIndicatorBadge & MetricTrendIndicator', () => {
    it('renders positive variation with success tokens', () => {
        render(<TrendIndicatorBadge value={12.5} />);

        const badge = screen.getByTestId('trend-indicator-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('+12.5%');
        expect(badge).toHaveClass('bg-success-subtle');
        expect(badge).toHaveClass('text-success-accent');
    });

    it('renders negative variation with destructive tokens', () => {
        render(<TrendIndicatorBadge value={-5.2} />);

        const badge = screen.getByTestId('trend-indicator-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('-5.2%');
        expect(badge).toHaveClass('bg-destructive-subtle');
        expect(badge).toHaveClass('text-destructive-accent');
    });

    it('renders zero variation with neutral muted tokens', () => {
        render(<TrendIndicatorBadge value={0} />);

        const badge = screen.getByTestId('trend-indicator-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('0.0%');
        expect(badge).toHaveClass('bg-muted');
        expect(badge).toHaveClass('text-muted-foreground');
    });

    it('inverts semantics when isPositiveGood is false', () => {
        const { rerender } = render(<TrendIndicatorBadge value={15} isPositiveGood={false} />);
        let badge = screen.getByTestId('trend-indicator-badge');
        expect(badge).toHaveClass('bg-warning-subtle');
        expect(badge).toHaveClass('text-warning-accent');

        rerender(<TrendIndicatorBadge value={-8} isPositiveGood={false} />);
        badge = screen.getByTestId('trend-indicator-badge');
        expect(badge).toHaveClass('bg-success-subtle');
        expect(badge).toHaveClass('text-success-accent');
    });

    it('MetricTrendIndicator alias works identically', () => {
        render(<MetricTrendIndicator value={8.4} />);

        const badge = screen.getByTestId('trend-indicator-badge');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveTextContent('+8.4%');
    });
});
