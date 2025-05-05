import { Spinner } from "@medusajs/icons";
import { Controller, UseFormReturn } from "react-hook-form";
import {
    Button,
    Checkbox,
    CheckboxCheckedState,
    createDataTableColumnHelper,
    DataTableRowSelectionState,
    useDataTable,
} from "@medusajs/ui";
import { Heading } from "@medusajs/ui";
import { DataTable } from "@medusajs/ui";
import { useMemo, useState, useCallback } from "react";
import { sdk } from "../../lib/sdk";
import { useVariantTableQuery } from "./use-variant-table-query";
import { useQuery } from "@tanstack/react-query";
import { clx } from "@medusajs/ui";
import { Photo } from "@medusajs/icons";
import { getStylizedAmount } from "../../lib/money-amount-helpers";

type Props = {
    form: UseFormReturn<any, any, undefined>;
    currencyCode?: string;
};

const VARIANT_PAGE_SIZE = 10;
const VARIANT_PREFIX = "variant";
const columnHelper = createDataTableColumnHelper<any>();

const createColumns = (props: Props) => [
    columnHelper.select({
        header: ({ table }) => {
            const currentVariants = props.form.getValues("variants") || [];
            return (
                <Controller
                    control={props.form.control}
                    name="variants"
                    render={({ field }) => {
                        // Get the actual rows on the current page
                        const currentPageRows = table.getRowModel().rows;
                        // Get all visible variant IDs from current page using actual rows
                        const visibleVariantIds = currentPageRows
                            .map((row) => row.original?.id)
                            .filter(Boolean);

                        // Check if all visible variants are selected
                        const allVisibleSelected = visibleVariantIds.every((id) =>
                            currentVariants.some((v: any) => v.id === id)
                        );
                        // Check if some (but not all) visible variants are selected
                        const someVisibleSelected = visibleVariantIds.some((id) =>
                            currentVariants.some((v: any) => v.id === id)
                        );

                        // Determine checkbox state
                        let checkboxState: CheckboxCheckedState = false;
                        if (allVisibleSelected && visibleVariantIds.length > 0) {
                            checkboxState = true;
                        } else if (someVisibleSelected) {
                            checkboxState = "indeterminate";
                        }

                        return (
                            <Checkbox
                                checked={checkboxState}
                                onCheckedChange={(value) => {
                                    if (value) {
                                        // Add all visible variants that are not already selected
                                        const newVariants = [...currentVariants];
                                        visibleVariantIds.forEach(id => {
                                            if (!newVariants.some((v: any) => v.id === id)) {
                                                const variant = currentPageRows.find(row => row.original.id === id)?.original;
                                                if (variant) {
                                                    newVariants.push({
                                                        id,
                                                        quantity: 1,
                                                        variant
                                                    });
                                                }
                                            }
                                        });
                                        field.onChange(newVariants);
                                    } else {
                                        // Remove all visible variants from selection
                                        const remainingVariants = currentVariants.filter(
                                            (v: any) => !visibleVariantIds.includes(v.id)
                                        );
                                        field.onChange(remainingVariants);
                                    }
                                }}
                            />
                        );
                    }}
                />
            );
        },
        cell: ({ row }) => {
            const variants = props.form.watch("variants") || [];
            const isSelected = variants.some((v: any) => v.id === row.original.id);
            return (
                <Controller
                    control={props.form.control}
                    name="variants"
                    render={({ field }) => (
                        <Checkbox
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={useCallback((checked: CheckboxCheckedState) => {
                                const currentVariants = props.form.getValues("variants") || [];
                                if (checked) {
                                    // Only add if not already present
                                    if (!currentVariants.some((v: any) => v.id === row.original.id)) {
                                        field.onChange([
                                            ...currentVariants,
                                            {
                                                id: row.original.id,
                                                quantity: 1,
                                                variant: row.original
                                            }
                                        ]);
                                    }
                                } else {
                                    field.onChange(
                                        currentVariants.filter((v: any) => v.id !== row.original.id)
                                    );
                                }
                            }, [row.original.id, props.form])}
                        />
                    )}
                />
            );
        },
    }),
    columnHelper.accessor("title", {
        header: () => <span>Variant</span>,
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <div
                    className={clx(
                        "bg-ui-bg-component border-ui-border-base flex items-center justify-center overflow-hidden rounded border h-8 w-6"
                    )}
                >
                    {row.original?.product?.thumbnail ? (
                        <img
                            src={row.original?.product?.thumbnail}
                            alt={row.original?.product?.title}
                            className="h-full w-full object-cover object-center"
                        />
                    ) : (
                        <Photo className="text-ui-fg-subtle" />
                    )}
                </div>
                <div className="text-sm text-gray-500">{row?.original?.title}</div>
            </div>
        ),
    }),
    columnHelper.accessor("product", {
        header: () => <span>Product</span>,
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <span title={row.original?.product?.title} className="truncate">
                    {row.original?.product?.title}
                </span>
            </div>
        ),
    }),
    columnHelper.accessor("prices", {
        header: () => <span>Price</span>,
        cell: ({ row }) => {
            const currencyCode = props.currencyCode || "inr";
            const defaultPrice = row.original.prices?.find(
                (p: any) => p.currency_code === currencyCode
            );
            if (!defaultPrice) {
                return "-";
            }
            const formatted = getStylizedAmount(
                defaultPrice?.amount,
                currencyCode
            )

            return formatted;
        },
    }),
];

const VariantTable = (props: Props) => {
    const [pageIndex, setPageIndex] = useState(0);

    const { searchParams: variantSearchParams } = useVariantTableQuery({
        pageSize: VARIANT_PAGE_SIZE,
        prefix: VARIANT_PREFIX,
    });

    const [searchValue, setSearchValue] = useState("");
    const { data, isLoading } = useQuery({
        queryFn: () =>
            sdk.admin.productVariant.list({
                ...variantSearchParams,
                offset: pageIndex * VARIANT_PAGE_SIZE,
                limit: VARIANT_PAGE_SIZE,
                q: searchValue || undefined,
            }),
        queryKey: ["product-variants", searchValue, pageIndex, variantSearchParams],
        staleTime: 30000,
    });

    const [variantSelection, setVariantSelection] =
        useState<DataTableRowSelectionState>({});

    const variantData = useMemo(() => {
        return data?.variants ?? [];
    }, [data?.variants]);

    const table = useDataTable({
        columns: useMemo(() => createColumns(props) as unknown as any, [props.currencyCode]),
        data: variantData,
        isLoading,
        rowCount: data?.count ?? 0,
        pagination: {
            onPaginationChange: useCallback(({ pageIndex: newPageIndex }) => {
                setPageIndex(newPageIndex);
            }, []),
            state: {
                pageIndex,
                pageSize: VARIANT_PAGE_SIZE,
            },
        },
        sorting: {
            state: null,
            onSortingChange: () => { },
        },
        search: {
            debounce: 1000,
            state: searchValue,
            onSearchChange: useCallback((value: string) => {
                setSearchValue(value);
                setPageIndex(0);
            }, []),
        },
        rowSelection: {
            state: useMemo(() => {
                return variantSelection;
            }, [variantSelection]),

            onRowSelectionChange: useCallback((state) => {
                setVariantSelection(state);
            }, []),
        },
    });

    return (
        <div>
            <DataTable instance={table}>
                <DataTable.Toolbar className="flex justify-between items-center">
                    <Heading>Products</Heading>
                    <DataTable.Search autoFocus={true} placeholder="Search Variants" />
                    <Button size="small" variant="secondary" asChild></Button>
                </DataTable.Toolbar>
                {isLoading ? (
                    <div className="flex items-center justify-center h-[251px]">
                        <Spinner className="animate-spin text-ui-fg-subtle" />
                    </div>
                ) : variantData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[251px] gap-y-2">
                        <span className="text-ui-fg-subtle">No results found</span>
                        {searchValue && (
                            <span className="text-ui-fg-subtle text-sm">
                                Try adjusting your search query
                            </span>
                        )}
                    </div>
                ) : (
                    <>

                        <DataTable.Table
                            emptyState={{
                                empty: {
                                    heading: "No variants available",
                                },
                            }}
                        />
                        {props.form.formState.errors.variants && (
                            <div className="mx-4 text-sm text-red-700">
                                {typeof props.form.formState.errors.variants.message === 'string'
                                    ? props.form.formState.errors.variants.message
                                    : 'At least one variant is required'}
                            </div>
                        )}
                        <DataTable.Pagination />
                    </>
                )}
            </DataTable>
        </div>
    );
};

export default VariantTable; 