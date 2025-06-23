import { useSearchParams } from "react-router";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";

export const PaginationBlock = ({
  currentPage,
  totalCount,
  pageSize,
}: {
  currentPage: number;
  totalCount: number;
  pageSize: number;
}) => {
  const [searchParams] = useSearchParams();

  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  const getPageUrl = (pageNumber: number) => {
    const currentSearchParams = new URLSearchParams(searchParams);
    currentSearchParams.set("page", pageNumber.toString());
    return `?${currentSearchParams.toString()}`;
  };

  // --- Calculate pagination range (copied from DocumentsTab) ---
  const pagesToShow = 2;
  let startPage = Math.max(1, currentPage - pagesToShow);
  let endPage = Math.min(totalPages, currentPage + pagesToShow);

  if (currentPage - pagesToShow <= 1) {
    endPage = Math.min(totalPages, 1 + pagesToShow * 2);
  }
  if (currentPage + pagesToShow >= totalPages) {
    startPage = Math.max(1, totalPages - pagesToShow * 2);
  }

  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="mt-4 flex justify-center">
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              to={getPageUrl(currentPage - 1)}
              preventScrollReset
              prefetch="intent"
              className={
                currentPage <= 1 ? "pointer-events-none opacity-50" : undefined
              }
              aria-disabled={currentPage <= 1}
              tabIndex={currentPage <= 1 ? -1 : undefined}
            />
          </PaginationItem>

          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink
                  to={getPageUrl(1)}
                  preventScrollReset
                  prefetch="intent"
                  isActive={currentPage === 1}
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}

          {pageNumbers.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                to={getPageUrl(page)}
                preventScrollReset
                prefetch="intent"
                isActive={currentPage === page}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  to={getPageUrl(totalPages)}
                  preventScrollReset
                  prefetch="intent"
                  isActive={currentPage === totalPages}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <PaginationNext
              to={getPageUrl(currentPage + 1)}
              preventScrollReset
              prefetch="intent"
              className={
                currentPage >= totalPages
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
              aria-disabled={currentPage >= totalPages}
              tabIndex={currentPage >= totalPages ? -1 : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
