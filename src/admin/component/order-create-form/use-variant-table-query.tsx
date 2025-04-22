import { useQueryParams } from "../../hooks/use-query-params"


type UseVariantTableQueryProps = {
    prefix?: string
    pageSize?: number
}

export const useVariantTableQuery = ({
    prefix,
    pageSize = 50,
}: UseVariantTableQueryProps) => {
    const queryObject = useQueryParams(
        [
            "q",
            "order",
            "offset",
            "manage_inventory",
            "allow_backorder",
            "created_at",
            "updated_at",
        ],
        prefix
    )
    const {
        q,
        order,
        offset,
        allow_backorder,
        manage_inventory,
        created_at,
        updated_at,
    } = queryObject

    const searchParams = {
        q,
        order: order ? order : "variant_rank",
        offset: offset ? parseInt(offset) : undefined,
        limit: pageSize,
        allow_backorder: allow_backorder ? JSON.parse(allow_backorder) : undefined,
        manage_inventory: manage_inventory
            ? JSON.parse(manage_inventory)
            : undefined,
        created_at: created_at ? JSON.parse(created_at) : undefined,
        updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    }
    return {
        searchParams,
        raw: queryObject,
    }
}
