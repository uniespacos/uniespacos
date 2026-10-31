import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginacaoRelatorioProps {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void;
}

export function PaginacaoRelatorio({ totalItems, itemsPerPage, currentPage, onPageChange }: PaginacaoRelatorioProps) {
    const { t } = useTranslation();
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) {
        return null;
    }

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;
        let startPage: number, endPage: number;

        if (totalPages <= maxPagesToShow) {
            startPage = 1;
            endPage = totalPages;
        } else {
            const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
            const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;

            if (currentPage <= maxPagesBeforeCurrent) {
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
                startPage = totalPages - maxPagesToShow + 1;
                endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrent;
                endPage = currentPage + maxPagesAfterCurrent;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(
                <Button
                    key={i}
                    variant={i === currentPage ? 'default' : 'outline'}
                    size="icon"
                    aria-label={t('common.a11y.goToPage', { page: i })}
                    aria-current={i === currentPage ? 'page' : undefined}
                    onClick={() => {
                        handlePageChange(i);
                    }}
                    className="h-11 min-h-[44px] w-11 min-w-[44px] text-sm md:h-9 md:min-h-9 md:w-9 md:min-w-9"
                >
                    {i}
                </Button>,
            );
        }

        return pageNumbers;
    };

    return (
        <div className="flex flex-col items-center justify-between gap-4 py-4 sm:flex-row">
            <div className="text-muted-foreground text-sm">Total de {totalItems} item(s) encontrado(s).</div>
            <nav aria-label={t('common.a11y.paginationNav')} className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Button
                    variant="outline"
                    className="hidden h-11 min-h-[44px] w-11 min-w-[44px] p-0 md:h-9 md:min-h-9 md:w-9 md:min-w-9 lg:flex"
                    onClick={() => {
                        handlePageChange(1);
                    }}
                    disabled={currentPage === 1}
                >
                    <span className="sr-only">{t('common.a11y.firstPage')}</span>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="h-11 min-h-[44px] w-11 min-w-[44px] p-0 md:h-9 md:min-h-9 md:w-9 md:min-w-9"
                    onClick={() => {
                        handlePageChange(currentPage - 1);
                    }}
                    disabled={currentPage === 1}
                >
                    <span className="sr-only">{t('common.a11y.previousPage')}</span>
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {renderPageNumbers()}

                <Button
                    variant="outline"
                    className="h-11 min-h-[44px] w-11 min-w-[44px] p-0 md:h-9 md:min-h-9 md:w-9 md:min-w-9"
                    onClick={() => {
                        handlePageChange(currentPage + 1);
                    }}
                    disabled={currentPage === totalPages}
                >
                    <span className="sr-only">{t('common.a11y.nextPage')}</span>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    className="hidden h-11 min-h-[44px] w-11 min-w-[44px] p-0 md:h-9 md:min-h-9 md:w-9 md:min-w-9 lg:flex"
                    onClick={() => {
                        handlePageChange(totalPages);
                    }}
                    disabled={currentPage === totalPages}
                >
                    <span className="sr-only">{t('common.a11y.lastPage')}</span>
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </nav>
        </div>
    );
}
