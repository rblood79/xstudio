import React from 'react';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    isLoading?: boolean;
    onPageChange: (page: number) => void;
    totalItems?: number;
    showPageInfo?: boolean;
    className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    hasNextPage,
    isLoading = false,
    onPageChange,
    totalItems,
    showPageInfo = true,
    className = ''
}) => {
    const handlePrevious = () => {
        if (currentPage > 1 && !isLoading) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (hasNextPage && !isLoading) {
            onPageChange(currentPage + 1);
        }
    };

    const handlePageClick = (page: number) => {
        if (!isLoading && page !== currentPage) {
            onPageChange(page);
        }
    };

    // 페이지 번호 배열 생성 (최대 5개)
    const getPageNumbers = () => {
        const maxVisible = 5;
        const start = Math.max(1, currentPage - 2);
        const end = Math.min(totalPages, start + maxVisible - 1);

        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            {/* 페이지네이션 버튼들 */}
            <div className="flex items-center gap-1">
                {/* 이전 페이지 버튼 */}
                <button
                    onClick={handlePrevious}
                    disabled={currentPage <= 1 || isLoading}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                    aria-label="이전 페이지"
                >
                    이전
                </button>

                {/* 페이지 번호들 */}
                {pageNumbers.map((pageNum) => (
                    <button
                        key={pageNum}
                        onClick={() => handlePageClick(pageNum)}
                        disabled={isLoading}
                        className={`px-3 py-2 rounded transition-colors ${pageNum === currentPage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            } disabled:opacity-50`}
                        aria-label={`페이지 ${pageNum}로 이동`}
                        aria-current={pageNum === currentPage ? 'page' : undefined}
                    >
                        {pageNum}
                    </button>
                ))}

                {/* 생략 표시 */}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                    <span className="px-2 text-gray-500">...</span>
                )}

                {/* 마지막 페이지 */}
                {totalPages > 5 && currentPage < totalPages - 2 && (
                    <button
                        onClick={() => handlePageClick(totalPages)}
                        disabled={isLoading}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                        aria-label={`페이지 ${totalPages}로 이동`}
                    >
                        {totalPages}
                    </button>
                )}

                {/* 다음 페이지 버튼 */}
                <button
                    onClick={handleNext}
                    disabled={!hasNextPage || isLoading}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
                    aria-label="다음 페이지"
                >
                    다음
                </button>
            </div>

            {/* 페이지 정보 */}
            {showPageInfo && (
                <div className="text-sm text-gray-600">
                    {totalItems ? (
                        <>
                            페이지 {currentPage} / {totalPages}
                            <span className="mx-1">•</span>
                            총 {totalItems}개 항목
                        </>
                    ) : (
                        `페이지 ${currentPage} / ${totalPages}`
                    )}
                </div>
            )}
        </div>
    );
};

export default Pagination;
