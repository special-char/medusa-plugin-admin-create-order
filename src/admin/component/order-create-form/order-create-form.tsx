import * as zod from "zod"
import { HttpTypes } from "@medusajs/types"
import { RouteFocusModal } from "../common/modals"
import { Button, Checkbox, IconButton, Input, toast } from "@medusajs/ui"
import { KeyboundForm } from "../common/keybound-form"
import { ProgressStatus, ProgressTabs } from "@medusajs/ui"
import { OrderCreateTab } from "./constants"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Minus, Plus, Spinner, XMark } from "@medusajs/icons"
import { Form } from "../common/form"
import { Combobox } from "../combobox"
import { sdk } from "../../lib/sdk"
import { useComboboxData } from "../../hooks"
import { useCustomer } from "../../hooks/customers"
import { useDataTable } from "../../hooks/use-data-table"
import { createColumnHelper, OnChangeFn, RowSelectionState } from "@tanstack/react-table"
import { useVariantTableQuery } from "./use-variant-table-query"
import { useVariants } from "../../hooks/product-variants"
import VariantTable from "./variant-table"
import { useNavigate } from "react-router-dom"
import { CountrySelect } from "../common/country-select/country-select"

const OrderCreateSchema = zod.object({
    region_id: zod.string().min(1, "Region is required"),
    variants: zod
        .array(
            zod.object({
                id: zod.string(),
                quantity: zod.number().min(1),
                variant: zod.any(),
            })
        )
        .min(1, "At least one variant is required"),
    customer_id: zod.string().optional(),
    email: zod
        .string()
        .min(1, "Email is required")
        .email("Invalid email address"),
    first_name: zod.string(),
    last_name: zod.string(),
    company_name: zod.string().optional(),
    phone: zod.string().optional(),
    // Shipping Address

    shipping_address_id: zod.string().optional(),
    shipping_first_name: zod.string().min(2, "First name is required"),
    shipping_last_name: zod.string().min(2, "Last name is required"),
    shipping_address_1: zod.string().min(1, "Address is required"),
    shipping_address_2: zod.string().optional(),
    shipping_address_name: zod.string().min(1, "Address name is required"),
    shipping_company: zod.string().optional(),
    shipping_country_code: zod.string().min(2, "Country is required").max(2),
    shipping_city: zod.string().optional(),
    shipping_postal_code: zod.string().optional(),
    shipping_state: zod.string().optional(),
    shipping_phone_number: zod.string().optional(),
    // Billing Address
    billing_address_name: zod.string().min(1, "Address name is required"),
    billing_same_as_shipping: zod.boolean().default(false),
    billing_address_id: zod.string().optional(),
    billing_first_name: zod.string().min(2, "First name is required"),
    billing_last_name: zod.string().min(2, "Last name is required"),
    billing_address_1: zod.string().min(1, "Address is required"),
    billing_address_2: zod.string().optional(),
    billing_company: zod.string().optional(),
    billing_country_code: zod.string().min(2, "Country is required").max(2),
    billing_city: zod.string().optional(),
    billing_postal_code: zod.string().optional(),
    billing_state: zod.string().optional(),
    billing_phone_number: zod.string().optional(),
})

type SelectedVariant = {
    id: string
    quantity: number
    variant: {
        id: string
        title: string
        product?: {
            id: string
            title: string
        }
        prices?: Array<{
            currency_code: string
            amount: number
        }>
    }
}

type OrderCreateFormProps = {
    region_id: string
    variants: SelectedVariant[]
    customer_id?: string
    email?: string
    first_name?: string
    last_name?: string
    company_name?: string
    phone?: string
    // Shipping Address
    shipping_address_name: string
    shipping_address_id: string
    shipping_first_name: string
    shipping_last_name: string
    shipping_address_1: string
    shipping_address_2: string
    shipping_company: string
    shipping_country_code: string
    shipping_city: string
    shipping_postal_code: string
    shipping_state: string
    shipping_phone_number: string
    // Billing Address
    billing_address_name: string
    billing_same_as_shipping: boolean
    billing_address_id: string
    billing_first_name: string
    billing_last_name: string
    billing_address_1: string
    billing_address_2: string
    billing_company: string
    billing_country_code: string
    billing_city: string
    billing_postal_code: string
    billing_state: string
    billing_phone_number: string
}

const OrderCreateForm = () => {
    // const { handleSuccess } = useRouteModal()
    const navigation = useNavigate();
    const form = useForm<OrderCreateFormProps>({
        resolver: zodResolver(OrderCreateSchema),
        defaultValues: {
            region_id: "",
            variants: [],
            customer_id: "",
            email: "",
            first_name: "",
            last_name: "",
            phone: "",
            company_name: "",
            // Shipping Address
            shipping_address_name: "",
            shipping_address_id: "",
            shipping_first_name: "",
            shipping_last_name: "",
            shipping_address_1: "",
            shipping_address_2: "",
            shipping_company: "",
            shipping_country_code: "",
            shipping_city: "",
            shipping_postal_code: "",
            shipping_state: "",
            shipping_phone_number: "",
            // Billing Address
            billing_same_as_shipping: true,
            billing_address_id: "",
            billing_first_name: "",
            billing_last_name: "",
            billing_address_1: "",
            billing_address_2: "",
            billing_company: "",
            billing_country_code: "",
            billing_city: "",
            billing_postal_code: "",
            billing_state: "",
            billing_phone_number: "",
            billing_address_name: "",
        },
        mode: "all",
        reValidateMode: "onChange",
    })

    const [variantQuantities, setVariantQuantities] = useState<
        Record<string, number>
    >({})

    const handleQuantityChange = (variantId: string, quantity: number) => {
        setVariantQuantities((prev) => ({
            ...prev,
            [variantId]: quantity,
        }))

        const currentVariants = form.getValues("variants")
        const updatedVariants = currentVariants.map((item) => {
            if (item.id === variantId) {
                return { ...item, quantity }
            }
            return item
        })

        form.setValue("variants", updatedVariants, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
        })
    }
    const promotions = useComboboxData({
        queryKey: ["promotions", "create-order"],
        queryFn: (params) => sdk.admin.promotion.list(params),
        getOptions: (data) =>
            data.promotions.map((promotion) => ({
                label: promotion.code!,
                value: promotion.code!,
            })),
    })

    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
        null
    )
    const { customer } = useCustomer(selectedCustomerId || "")
    type TabState = Record<OrderCreateTab, ProgressStatus>
    const [tab, setTab] = useState<OrderCreateTab>(OrderCreateTab.REGION)
    const [tabState, setTabState] = useState<TabState>({
        [OrderCreateTab.REGION]: "in-progress",
        [OrderCreateTab.PRODUCTS]: "not-started",
        [OrderCreateTab.CUSTOMER]: "not-started",
        [OrderCreateTab.CUSTOMER_ADDRESS]: "not-started",
    })
    // const { t } = useTranslation()
    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)
    const [currencyCode, setCurrencyCode] = useState<string>("inr")

    // const { data: regionData } = useQuery({
    //     queryFn: () => sdk.admin.region.retrieve(selectedRegionId || ""),
    //     queryKey: ["region", selectedRegionId],
    //     enabled: !!selectedRegionId,
    // })

    const regions = useComboboxData({
        queryKey: ["region", "create-order"],
        queryFn: (params) => sdk.admin.region.list(params),
        getOptions: (data) =>
            data.regions.map((region) => ({
                label: region.name,
                value: region.id,
                currency_code: region.currency_code,
                countries: region.countries,
            })),
    })

    const customers = useComboboxData({
        queryKey: ["customer", "create-order"],
        queryFn: (params) => sdk.admin.customer.list(params),
        getOptions: (data) =>
            data.customers.map((customer) => ({
                label: `${customer.email} (${customer.has_account === false ? "Guest" : "Registered"})`,
                value: customer.id,
            })),
    })
    const customersAddress = useComboboxData({
        queryKey: ["customer-address", "create-order", form.getValues("customer_id")],
        queryFn: async (params) => {
            const customerId = form.getValues("customer_id");
            if (!customerId) {
                return { addresses: [], count: 0, offset: 0, limit: 10 };
            }
            try {
                const response = await sdk.client.fetch<any>(
                    `/admin/customers/${customerId}/addresses?fields=address_name,first_name,last_name,company,address_1,phone,country_code,postal_code,city,province`,
                    {
                        method: "GET",
                    }
                );
                return response;
            } catch (error) {
                console.error("Error fetching customer addresses:", error);
                return { addresses: [], count: 0, offset: 0, limit: 10 };
            }
        },
        getOptions: (data) => {
            if (!data?.addresses) {
                return [];
            }
            return data.addresses.map((address: any) => ({
                label: `${address.address_1}${address.address_2 ? `, ${address.address_2}` : ''} (${address.city || ''}, ${address.province || ''})`,
                value: address.id,
                country_code: address.country_code,
                province: address.province,
                postal_code: address.postal_code,
                first_name: address.first_name,
                last_name: address.last_name,
                phone: address.phone,
                company: address.company,
                address_1: address.address_1,
                address_2: address.address_2,
                city: address.city,
                address_name: address.address_name,
            }));
        },
    })
    useEffect(() => {
        if (customer) {
            form.setValue("email", customer.email)
            form.setValue("first_name", customer.first_name || "")
            form.setValue("last_name", customer.last_name || "")
            form.setValue("phone", customer.phone || "")
            form.setValue("company_name", customer.company_name || "")
        }
    }, [customer, form])
    const VARIANT_PAGE_SIZE = 10
    const VARIANT_PREFIX = "variant"
    const { searchParams: variantSearchParams, raw: variantRaw } =
        useVariantTableQuery({
            pageSize: VARIANT_PAGE_SIZE,
            prefix: VARIANT_PREFIX,
        })

    const variantColumns = useVariantColumns({
        onQuantityChange: handleQuantityChange,
        quantities: variantQuantities,
    })

    const { variants = [], count: variantCount } = useVariants({
        ...variantSearchParams,
    })

    const variantsData = variants || []

    const [variantSelection, setVariantSelection] = useState<RowSelectionState>(
        () =>
            (variantsData ?? []).reduce((acc: any, p: any) => {
                acc[p.id!] = false
                return acc
            }, {} as RowSelectionState)
    )

    const variantUpdater: OnChangeFn<RowSelectionState> = (newSelection) => {
        const value =
            typeof newSelection === "function"
                ? newSelection(variantSelection)
                : newSelection

        const selectedVariants = Object.entries(value)
            .filter(([_, isSelected]) => isSelected)
            .map(([id]) => {
                const variant = variantsData.find((v: any) => v.id === id)
                return {
                    id,
                    quantity: variantQuantities[id] || 1,
                    variant: variant,
                }
            })

        form.setValue("variants", selectedVariants, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
        })

        setVariantSelection(value)
    }
    const { table: productTable } = useDataTable({
        data: variantsData,
        columns: variantColumns,
        getRowId: (original: any) => original.id,
        count: variantCount,
        pageSize: VARIANT_PAGE_SIZE,
        prefix: VARIANT_PREFIX,
        enableRowSelection: (row) => {
            return !variantSelection[row.original.id]
        },
        enablePagination: true,
        rowSelection: {
            state: variantSelection,
            updater: variantUpdater,
        },
    })

    const handleTabChange = async (tab: OrderCreateTab) => {
        // Don't do anything if trying to navigate to current tab
        if (tab === OrderCreateTab.REGION) {
            setTab(tab)
            setTabState((prev) => ({
                ...prev,
                [OrderCreateTab.REGION]: "in-progress",
                [OrderCreateTab.PRODUCTS]: "not-started",
                [OrderCreateTab.CUSTOMER]: "not-started",

                [OrderCreateTab.CUSTOMER_ADDRESS]: "not-started",
            }))
            return
        }

        // For other tabs, validate required fields
        if (tab === OrderCreateTab.PRODUCTS) {
            const valid = await form.trigger("region_id")
            if (!valid) {
                const errors = form.formState.errors;

                return
            }

            setTab(tab)
            setTabState((prev) => ({
                ...prev,
                [OrderCreateTab.REGION]: "completed",
                [OrderCreateTab.PRODUCTS]: "in-progress",
                [OrderCreateTab.CUSTOMER]: "not-started",

                [OrderCreateTab.CUSTOMER_ADDRESS]: "not-started",
            }))
            return
        }

        if (tab === OrderCreateTab.CUSTOMER) {
            const valid = await form.trigger(["region_id", "variants"])
            if (!valid) {
                const errors = form.formState.errors;

                console.log("🚀 ~ handleTabChange ~ errors:", errors)
                return
            }

            setTab(tab)
            setTabState((prev) => ({
                ...prev,
                [OrderCreateTab.REGION]: "completed",
                [OrderCreateTab.PRODUCTS]: "completed",
                [OrderCreateTab.CUSTOMER]: "in-progress",

                [OrderCreateTab.CUSTOMER_ADDRESS]: "not-started",
            }))
            return
        }
        if (tab === OrderCreateTab.CUSTOMER_ADDRESS) {
            const valid = await form.trigger(["region_id", "variants", "email", "first_name", "last_name", "shipping_address_name", "shipping_address_1", "shipping_city", "shipping_country_code", "shipping_postal_code", "shipping_state", "shipping_phone_number", "shipping_company", "billing_same_as_shipping", "billing_address_name", "billing_address_1", "billing_city", "billing_country_code", "billing_postal_code", "billing_state", "billing_phone_number", "billing_company"])

            if (!valid) {
                const errors = form.formState.errors;
                console.log("🚀 ~ handleTabChange ~ errors:", errors)
                return
            }

            setTab(tab)
            setTabState((prev) => ({
                ...prev,
                [OrderCreateTab.REGION]: "completed",
                [OrderCreateTab.PRODUCTS]: "completed",
                [OrderCreateTab.CUSTOMER]: "completed",
                [OrderCreateTab.CUSTOMER_ADDRESS]: "in-progress",
            }))
            return
        }
    }

    const handleContinue = async () => {
        switch (tab) {
            case OrderCreateTab.REGION: {
                // Validate region before continuing
                const valid = await form.trigger("region_id")
                if (!valid) {
                    return
                }
                handleTabChange(OrderCreateTab.PRODUCTS)
                break
            }
            case OrderCreateTab.PRODUCTS: {
                // Validate both region and products before continuing
                const valid = await form.trigger(["region_id", "variants"])
                if (valid) {
                    handleTabChange(OrderCreateTab.CUSTOMER)
                }
                break
            }
            case OrderCreateTab.CUSTOMER: {
                // Validate all fields before continuing
                const valid = await form.trigger(["region_id", "variants", "email", "first_name", "last_name",])
                if (valid) {
                    handleTabChange(OrderCreateTab.CUSTOMER_ADDRESS)
                }
                break
            }
            case OrderCreateTab.CUSTOMER_ADDRESS: {
                const valid = await form.trigger(["region_id", "variants", "email", "first_name", "last_name", "shipping_address_name", "shipping_address_1", "shipping_city", "shipping_country_code", "shipping_postal_code", "shipping_state", "shipping_phone_number", "shipping_company", "billing_same_as_shipping", "billing_address_name", "billing_address_1", "billing_city", "billing_country_code", "billing_postal_code", "billing_state", "billing_phone_number", "billing_company"])

                if (valid) {
                    await onSubmit(form.getValues())
                }
                break
            }
        }
    }

    const onSubmit = async (data: OrderCreateFormProps) => {
        try {
            if (!data?.region_id) {
                toast.error("Region Id is required")
            }
            const user = {
                customer_id: data?.customer_id || "",
                email: data?.email || "",
                first_name: data?.first_name || "",
                last_name: data?.last_name || "",
                company_name: data?.company_name || "",
                phone: data?.phone || "",
            }

            const items = data?.variants?.map((item) => ({
                variant_id: item?.id,
                quantity: item?.quantity,
                product_id: item?.variant?.product?.id,
            }))

            // Add flags for existing addresses
            const shipping_address = {
                address_name: data?.shipping_address_name || "",
                address_1: data?.shipping_address_1 || "",
                address_2: data?.shipping_address_2 || "",
                city: data?.shipping_city || "",
                country_code: data?.shipping_country_code || "",
                province: data?.shipping_state || "",
                postal_code: data?.shipping_postal_code || "",
                company: data?.shipping_company || "",
                first_name: data?.shipping_first_name || "",
                last_name: data?.shipping_last_name || "",
                phone: data?.shipping_phone_number || "",
                is_existing_address: !!data?.shipping_address_id, // Add flag
                address_id: data?.shipping_address_id || "", // Add existing address ID
            }

            // Create billing address data with existing address flag
            const billing_address = data?.billing_same_as_shipping
                ? { ...shipping_address }
                : {
                    address_name: data?.billing_address_name || "",
                    address_1: data?.billing_address_1 || "",
                    address_2: data?.billing_address_2 || "",
                    city: data?.billing_city || "",
                    country_code: data?.billing_country_code || "",
                    province: data?.billing_state || "",
                    postal_code: data?.billing_postal_code || "",
                    company: data?.billing_company || "",
                    first_name: data?.billing_first_name || "",
                    last_name: data?.billing_last_name || "",
                    phone: data?.billing_phone_number || "",
                    is_existing_address: !!data?.billing_address_id, // Add flag
                    address_id: data?.billing_address_id || "", // Add existing address ID
                }

            const orderData = {
                region_id: data?.region_id,
                items,
                user,
                shipping_address,
                billing_address,
            }

            const order = await sdk.client.fetch<any>(
                "/admin/create-order",
                {
                    method: "POST",
                    body: orderData,
                }
            )
            if (order) {
                toast.success("Order placed successfully")
                navigation(`/orders/${order.id}`)
            }
        } catch (error: any) {
            console.error("Error Creating Order", error.message)
            toast.error("Failed to create order", error.message)
        }
    }
    sdk.admin.draftOrder.create
    return (
        <RouteFocusModal>

            <KeyboundForm className="flex h-full flex-col">
                <ProgressTabs
                    value={tab}
                    onValueChange={(value) => {
                        if (value === OrderCreateTab.CUSTOMER_ADDRESS) {
                            handleTabChange(OrderCreateTab.CUSTOMER_ADDRESS)
                        }
                    }}
                    className="flex h-full flex-col overflow-auto"
                >
                    <RouteFocusModal.Header>
                        <div className="flex w-full items-center justify-between gap-x-4">
                            <div className="-my-2 w-full max-w-[600px] border-l">
                                <ProgressTabs.List className="grid w-full grid-cols-4 text-sm">
                                    <ProgressTabs.Trigger
                                        className="w-full truncate px-1"
                                        value={OrderCreateTab.REGION}
                                        status={tabState[OrderCreateTab.REGION]}
                                        onClick={() => handleTabChange(OrderCreateTab.REGION)}
                                    >
                                        Region
                                    </ProgressTabs.Trigger>

                                    <ProgressTabs.Trigger
                                        className="w-full truncate px-1"
                                        value={OrderCreateTab.PRODUCTS}
                                        status={tabState[OrderCreateTab.PRODUCTS]}
                                        onClick={() => handleTabChange(OrderCreateTab.PRODUCTS)}
                                    >
                                        Products
                                    </ProgressTabs.Trigger>
                                    <ProgressTabs.Trigger
                                        className="w-full truncate px-1"
                                        value={OrderCreateTab.CUSTOMER}
                                        status={tabState[OrderCreateTab.CUSTOMER]}
                                        onClick={() => handleTabChange(OrderCreateTab.CUSTOMER)}
                                    >
                                        Customer
                                    </ProgressTabs.Trigger>
                                    <ProgressTabs.Trigger
                                        className="w-full truncate px-1"
                                        value={OrderCreateTab.CUSTOMER_ADDRESS}
                                        status={tabState[OrderCreateTab.CUSTOMER_ADDRESS]}
                                        onClick={() => handleTabChange(OrderCreateTab.CUSTOMER_ADDRESS)}
                                    >
                                        Customer Address
                                    </ProgressTabs.Trigger>
                                </ProgressTabs.List>
                            </div>
                        </div>
                    </RouteFocusModal.Header>

                    <RouteFocusModal.Body className="flex-1 overflow-auto">
                        <ProgressTabs.Content
                            value={OrderCreateTab.REGION}
                            className="flex flex-col items-center"
                        >
                            <div className="flex size-full max-w-3xl flex-col p-8">
                                <Form.Field
                                    control={form.control}
                                    name="region_id"
                                    render={({ field, fieldState }) => {
                                        return (
                                            <Form.Item className="w-full">
                                                <Form.Label>Region</Form.Label>
                                                <Form.Control>
                                                    <div className="relative" style={{ zIndex: 100 }}>
                                                        <Combobox
                                                            {...field}
                                                            options={regions.options}
                                                            onSearchValueChange={regions.onSearchValueChange}
                                                            searchValue={regions.searchValue}
                                                            fetchNextPage={regions.fetchNextPage} onChange={(value) => {
                                                                field.onChange(value)
                                                                setSelectedRegionId(value as string | null)
                                                                setCurrencyCode(regions.options.find((option) => option.value === value)?.currency_code || "inr")
                                                            }}
                                                        />
                                                    </div>
                                                </Form.Control>
                                                {fieldState.error && (
                                                    <div className="text-red-500 text-sm mt-1">
                                                        {fieldState.error.message}
                                                    </div>
                                                )}
                                            </Form.Item>
                                        )
                                    }}
                                />
                            </div>
                        </ProgressTabs.Content>

                        <ProgressTabs.Content
                            value={OrderCreateTab.PRODUCTS}
                            className="size-full overflow-y-auto"
                        >
                            <Form.Field
                                control={form.control}
                                name="variants"
                                render={({ field, fieldState }) => (
                                    <div className="flex flex-col">
                                        <input
                                            type="hidden"
                                            {...field}
                                            value={JSON.stringify(field.value)}
                                        />
                                        <VariantTable form={form} currencyCode={currencyCode} />
                                    </div>
                                )}
                            />
                        </ProgressTabs.Content>

                        <ProgressTabs.Content
                            value={OrderCreateTab.CUSTOMER}
                            className="flex flex-col items-center"
                        >
                            <div className="flex size-full max-w-3xl flex-col gap-4 p-16">
                                <Form.Field
                                    control={form.control}
                                    name="customer_id"
                                    render={({ field, }) => {
                                        return (
                                            <Form.Item>
                                                <Form.Label>Choose Existing Customer</Form.Label>
                                                <Form.Control>
                                                    <div className="relative">
                                                        <Combobox
                                                            {...field}
                                                            options={customers.options}
                                                            onSearchValueChange={
                                                                customers.onSearchValueChange
                                                            }
                                                            searchValue={customers.searchValue}
                                                            fetchNextPage={customers.fetchNextPage}
                                                            onChange={(value) => {
                                                                field.onChange(value)
                                                                setSelectedCustomerId(value as string | null)
                                                            }}
                                                        />
                                                        {field.value && (
                                                            <IconButton
                                                                type="button"
                                                                variant="transparent"
                                                                className="absolute right-10 top-1/2 -translate-y-1/2 rounded-none"
                                                                onClick={() => {
                                                                    field.onChange("")
                                                                    setSelectedCustomerId(null)
                                                                    form.reset({
                                                                        ...form.getValues(),
                                                                        customer_id: "",
                                                                        email: "",
                                                                        first_name: "",
                                                                        last_name: "",
                                                                        phone: "",
                                                                        company_name: "",
                                                                    })
                                                                }}
                                                            >
                                                                <XMark />
                                                            </IconButton>
                                                        )}
                                                    </div>
                                                </Form.Control>
                                                <Form.ErrorMessage />
                                            </Form.Item>
                                        )
                                    }}
                                />
                                <Form.Field
                                    control={form.control}
                                    name="email"
                                    render={({ field, fieldState }) => {
                                        return (
                                            <Form.Item>
                                                <Form.Label>Email</Form.Label>
                                                <Form.Control>
                                                    <Input
                                                        autoComplete="off"
                                                        {...field}
                                                        disabled={!!form.watch("customer_id")}
                                                    />
                                                </Form.Control>
                                                {fieldState.error && (
                                                    <div className="text-red-500 text-sm mt-1">
                                                        {fieldState.error.message}
                                                    </div>
                                                )}
                                            </Form.Item>
                                        )
                                    }}
                                />
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Form.Field
                                        control={form.control}
                                        name="first_name"
                                        render={({ field, fieldState }) => {
                                            return (
                                                <Form.Item>
                                                    <Form.Label>First Name</Form.Label>
                                                    <Form.Control>
                                                        <Input autoComplete="off" {...field} />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )
                                        }}
                                    />
                                    <Form.Field
                                        control={form.control}
                                        name="last_name"
                                        render={({ field, fieldState }) => {
                                            return (
                                                <Form.Item>
                                                    <Form.Label>Last Name</Form.Label>
                                                    <Form.Control>
                                                        <Input autoComplete="off" {...field} />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )
                                        }}
                                    />
                                    <Form.Field
                                        control={form.control}
                                        name="company_name"
                                        render={({ field }) => {
                                            return (
                                                <Form.Item>
                                                    <Form.Label optional>
                                                        Company
                                                    </Form.Label>
                                                    <Form.Control>
                                                        <Input autoComplete="off" {...field} />
                                                    </Form.Control>
                                                    <Form.ErrorMessage />
                                                </Form.Item>
                                            )
                                        }}
                                    />
                                    <Form.Field
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => {
                                            return (
                                                <Form.Item>
                                                    <Form.Label optional>Phone</Form.Label>
                                                    <Form.Control>
                                                        <Input autoComplete="off" {...field} />
                                                    </Form.Control>
                                                    <Form.ErrorMessage />
                                                </Form.Item>
                                            )
                                        }}
                                    />
                                </div>
                            </div>
                        </ProgressTabs.Content>

                        <ProgressTabs.Content
                            value={OrderCreateTab.CUSTOMER_ADDRESS}
                            className="flex flex-col items-center"
                        >
                            <div className="flex size-full max-w-3xl flex-col gap-8 p-8">
                                <div className="flex flex-col gap-4">
                                    <h2 className="text-xl font-semibold">Shipping Address</h2>
                                    <Form.Field
                                        control={form.control}
                                        name="shipping_address_id"
                                        render={({ field }) => {
                                            return (
                                                <Form.Item>
                                                    <Form.Label>Choose Existing Address</Form.Label>
                                                    <Form.Control>
                                                        <div className="relative">
                                                            <Combobox
                                                                {...field}
                                                                options={customersAddress.options}
                                                                onSearchValueChange={
                                                                    customersAddress.onSearchValueChange
                                                                }
                                                                searchValue={customersAddress.searchValue}
                                                                fetchNextPage={customersAddress.fetchNextPage}
                                                                onChange={(value) => {
                                                                    field.onChange(value)
                                                                    // Find the selected address from options
                                                                    const selectedAddress = customersAddress.options.find(
                                                                        (option) => option.value === value
                                                                    )
                                                                    if (selectedAddress) {
                                                                        // Update shipping address fields
                                                                        form.setValue("shipping_first_name", selectedAddress.first_name)
                                                                        form.setValue("shipping_last_name", selectedAddress.last_name)
                                                                        form.setValue("shipping_address_1", selectedAddress.address_1)
                                                                        form.setValue("shipping_address_2", selectedAddress.address_2)
                                                                        form.setValue("shipping_company", selectedAddress.company)
                                                                        form.setValue("shipping_country_code", selectedAddress.country_code)
                                                                        form.setValue("shipping_city", selectedAddress.city)
                                                                        form.setValue("shipping_postal_code", selectedAddress.postal_code)
                                                                        form.setValue("shipping_state", selectedAddress.province)
                                                                        form.setValue("shipping_phone_number", selectedAddress.phone)
                                                                        form.setValue("shipping_address_name", selectedAddress.address_name)
                                                                        if (form.getValues("billing_same_as_shipping")) {
                                                                            form.setValue("billing_first_name", selectedAddress.first_name)
                                                                            form.setValue("billing_last_name", selectedAddress.last_name)
                                                                            form.setValue("billing_address_1", selectedAddress.address_1)
                                                                            form.setValue("billing_address_2", selectedAddress.address_2)
                                                                            form.setValue("billing_company", selectedAddress.company)
                                                                            form.setValue("billing_country_code", selectedAddress.country_code)
                                                                            form.setValue("billing_city", selectedAddress.city)
                                                                            form.setValue("billing_postal_code", selectedAddress.postal_code)
                                                                            form.setValue("billing_state", selectedAddress.province)
                                                                            form.setValue("billing_phone_number", selectedAddress.phone)
                                                                            form.setValue("billing_address_name", selectedAddress.address_name)
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            {field.value && (
                                                                <IconButton
                                                                    type="button"
                                                                    variant="transparent"
                                                                    className="absolute right-10 top-1/2 -translate-y-1/2 rounded-none"
                                                                    onClick={() => {
                                                                        field.onChange("")
                                                                        // Reset shipping address fields
                                                                        form.setValue("shipping_first_name", "")
                                                                        form.setValue("shipping_last_name", "")
                                                                        form.setValue("shipping_address_1", "")
                                                                        form.setValue("shipping_address_2", "")
                                                                        form.setValue("shipping_company", "")
                                                                        form.setValue("shipping_country_code", "")
                                                                        form.setValue("shipping_city", "")
                                                                        form.setValue("shipping_postal_code", "")
                                                                        form.setValue("shipping_state", "")
                                                                        form.setValue("shipping_phone_number", "")
                                                                        form.setValue("shipping_address_name", "")
                                                                    }}
                                                                >
                                                                    <XMark />
                                                                </IconButton>
                                                            )}
                                                        </div>
                                                    </Form.Control>
                                                    <Form.ErrorMessage />
                                                </Form.Item>
                                            )
                                        }}
                                    />
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <Form.Field
                                            control={form.control}
                                            name="shipping_first_name"
                                            render={({ field, fieldState }) => (
                                                <Form.Item>
                                                    <Form.Label>First name</Form.Label>
                                                    <Form.Control>
                                                        <Input
                                                            autoComplete="off"
                                                            {...field}
                                                            disabled={!!form.watch("shipping_address_id")}
                                                        />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )}
                                        />
                                        <Form.Field
                                            control={form.control}
                                            name="shipping_last_name"
                                            render={({ field, fieldState }) => (
                                                <Form.Item>
                                                    <Form.Label>Last name</Form.Label>
                                                    <Form.Control>
                                                        <Input
                                                            autoComplete="off"
                                                            {...field}
                                                            disabled={!!form.watch("shipping_address_id")}
                                                        />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )}
                                        />
                                        <Form.Field
                                            control={form.control}
                                            name="shipping_address_name"
                                            render={({ field, fieldState }) => (
                                                <Form.Item>
                                                    <Form.Label>Address Name</Form.Label>
                                                    <Form.Control>
                                                        <Input
                                                            autoComplete="off"
                                                            {...field}
                                                            disabled={!!form.watch("shipping_address_id")}
                                                        />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )}
                                        /><Form.Field
                                            control={form.control}
                                            name="shipping_address_1"
                                            render={({ field, fieldState }) => (
                                                <Form.Item>
                                                    <Form.Label>Address</Form.Label>
                                                    <Form.Control>
                                                        <Input
                                                            autoComplete="off"
                                                            {...field}
                                                            disabled={!!form.watch("shipping_address_id")}
                                                        />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )}
                                        /><Form.Field
                                            control={form.control}
                                            name="shipping_phone_number"
                                            render={({ field, fieldState }) => (
                                                <Form.Item>
                                                    <Form.Label>Phone Number</Form.Label>
                                                    <Form.Control>
                                                        <Input
                                                            autoComplete="off"
                                                            {...field}
                                                            disabled={!!form.watch("shipping_address_id")}
                                                        />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )}
                                        />
                                        <Form.Field
                                            control={form.control}
                                            name="shipping_company"
                                            render={({ field, fieldState }) => (
                                                <Form.Item>
                                                    <Form.Label>Company</Form.Label>
                                                    <Form.Control>
                                                        <Input
                                                            autoComplete="off"
                                                            {...field}
                                                            disabled={!!form.watch("shipping_address_id")}
                                                        />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )}
                                        />
                                        <Form.Field
                                            control={form.control}
                                            name="shipping_postal_code"
                                            render={({ field, fieldState }) => (
                                                <Form.Item>
                                                    <Form.Label>Pincode</Form.Label>
                                                    <Form.Control>
                                                        <Input
                                                            autoComplete="off"
                                                            {...field}
                                                            disabled={!!form.watch("shipping_address_id")}
                                                        />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )}
                                        />
                                        <Form.Field
                                            control={form.control}
                                            name="shipping_city"
                                            render={({ field, fieldState }) => (
                                                <Form.Item>
                                                    <Form.Label>City</Form.Label>
                                                    <Form.Control>
                                                        <Input
                                                            autoComplete="off"
                                                            {...field}
                                                            disabled={!!form.watch("shipping_address_id")}
                                                        />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )}
                                        />
                                        <Form.Field
                                            control={form.control}
                                            name="shipping_country_code"
                                            render={({ field, fieldState }) => (
                                                <Form.Item>
                                                    <Form.Label>Country</Form.Label>
                                                    <Form.Control>
                                                        <CountrySelect
                                                            {...field}
                                                            disabled={!!form.watch("shipping_address_id")}
                                                            countries={regions.options?.find((region) => region.value === form.getValues("region_id"))?.countries}
                                                            defaultValue={form.getValues("shipping_country_code")}
                                                        />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )}
                                        />
                                        <Form.Field
                                            control={form.control}
                                            name="shipping_state"
                                            render={({ field, fieldState }) => (
                                                <Form.Item>
                                                    <Form.Label>State</Form.Label>
                                                    <Form.Control>
                                                        <Input
                                                            autoComplete="off"
                                                            {...field}
                                                            disabled={!!form.watch("shipping_address_id")}
                                                        />
                                                    </Form.Control>
                                                    {fieldState.error && (
                                                        <div className="text-red-500 text-sm mt-1">
                                                            {fieldState.error.message}
                                                        </div>
                                                    )}
                                                </Form.Item>
                                            )}
                                        />
                                    </div>
                                </div>

                                <Form.Field
                                    control={form.control}
                                    name="billing_same_as_shipping"
                                    render={({ field }) => (
                                        <Form.Item className="flex items-center gap-2 py-2">
                                            <div className="flex items-center gap-2">
                                                <Form.Control>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={(checked) => {
                                                            field.onChange(checked)
                                                            if (checked) {
                                                                // Copy shipping address to billing address
                                                                const shippingData = form.getValues()
                                                                form.setValue("billing_first_name", shippingData.shipping_first_name)
                                                                form.setValue("billing_last_name", shippingData.shipping_last_name)
                                                                form.setValue("billing_address_1", shippingData.shipping_address_1)
                                                                form.setValue("billing_address_2", shippingData.shipping_address_2)
                                                                form.setValue("billing_company", shippingData.shipping_company)
                                                                form.setValue("billing_country_code", shippingData.shipping_country_code)
                                                                form.setValue("billing_city", shippingData.shipping_city)
                                                                form.setValue("billing_postal_code", shippingData.shipping_postal_code)
                                                                form.setValue("billing_state", shippingData.shipping_state)
                                                                form.setValue("billing_phone_number", shippingData.shipping_phone_number)
                                                                form.setValue("billing_address_name", shippingData.shipping_address_name)
                                                            }
                                                        }}
                                                    />
                                                </Form.Control>
                                                <Form.Label className="m-0 cursor-pointer text-sm font-normal">
                                                    Billing address same as shipping address
                                                </Form.Label>
                                            </div>
                                        </Form.Item>
                                    )}
                                />

                                {!form.watch("billing_same_as_shipping") && (
                                    <div className="flex flex-col gap-4">
                                        <h2 className="text-xl font-semibold">Billing Address</h2>
                                        <Form.Field
                                            control={form.control}
                                            name="billing_address_id"
                                            render={({ field }) => {
                                                return (
                                                    <Form.Item>
                                                        <Form.Label>Choose Existing Address</Form.Label>
                                                        <Form.Control>
                                                            <div className="relative">
                                                                <Combobox
                                                                    {...field}
                                                                    options={customersAddress.options}
                                                                    onSearchValueChange={
                                                                        customersAddress.onSearchValueChange
                                                                    }
                                                                    searchValue={customersAddress.searchValue}
                                                                    fetchNextPage={customersAddress.fetchNextPage}
                                                                    onChange={(value) => {
                                                                        field.onChange(value)
                                                                        // Find the selected address from options
                                                                        const selectedAddress = customersAddress.options.find(
                                                                            (option) => option.value === value
                                                                        )
                                                                        if (selectedAddress) {
                                                                            // Update billing address fields
                                                                            form.setValue("billing_first_name", selectedAddress.first_name)
                                                                            form.setValue("billing_last_name", selectedAddress.last_name)
                                                                            form.setValue("billing_address_1", selectedAddress.address_1)
                                                                            form.setValue("billing_address_2", selectedAddress.address_2)
                                                                            form.setValue("billing_company", selectedAddress.company)
                                                                            form.setValue("billing_country_code", selectedAddress.country_code)
                                                                            form.setValue("billing_city", selectedAddress.city)
                                                                            form.setValue("billing_postal_code", selectedAddress.postal_code)
                                                                            form.setValue("billing_state", selectedAddress.province)
                                                                            form.setValue("billing_phone_number", selectedAddress.phone)
                                                                            form.setValue("billing_address_name", selectedAddress.address_name)
                                                                        }
                                                                    }}
                                                                />
                                                                {field.value && (
                                                                    <IconButton
                                                                        type="button"
                                                                        variant="transparent"
                                                                        className="absolute right-10 top-1/2 -translate-y-1/2 rounded-none"
                                                                        onClick={() => {
                                                                            field.onChange("")
                                                                            // Reset billing address fields
                                                                            form.setValue("billing_first_name", "")
                                                                            form.setValue("billing_last_name", "")
                                                                            form.setValue("billing_address_1", "")
                                                                            form.setValue("billing_address_2", "")
                                                                            form.setValue("billing_company", "")
                                                                            form.setValue("billing_country_code", "")
                                                                            form.setValue("billing_city", "")
                                                                            form.setValue("billing_postal_code", "")
                                                                            form.setValue("billing_state", "")
                                                                            form.setValue("billing_phone_number", "")
                                                                            form.setValue("billing_address_name", "")
                                                                        }}
                                                                    >
                                                                        <XMark />
                                                                    </IconButton>
                                                                )}
                                                            </div>
                                                        </Form.Control>
                                                        <Form.ErrorMessage />
                                                    </Form.Item>
                                                )
                                            }}
                                        />

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <Form.Field
                                                control={form.control}
                                                name="billing_first_name"
                                                render={({ field, fieldState }) => (
                                                    <Form.Item>
                                                        <Form.Label>First name</Form.Label>
                                                        <Form.Control>
                                                            <Input
                                                                autoComplete="off"
                                                                {...field}
                                                                disabled={!!form.watch("billing_address_id") || form.watch("billing_same_as_shipping")}
                                                            />
                                                        </Form.Control>
                                                        {fieldState.error && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                {fieldState.error.message}
                                                            </div>
                                                        )}
                                                    </Form.Item>
                                                )}
                                            />
                                            <Form.Field
                                                control={form.control}
                                                name="billing_last_name"
                                                render={({ field, fieldState }) => (
                                                    <Form.Item>
                                                        <Form.Label>Last name</Form.Label>
                                                        <Form.Control>
                                                            <Input
                                                                autoComplete="off"
                                                                {...field}
                                                                disabled={!!form.watch("billing_address_id") || form.watch("billing_same_as_shipping")}
                                                            />
                                                        </Form.Control>
                                                        {fieldState.error && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                {fieldState.error.message}
                                                            </div>
                                                        )}
                                                    </Form.Item>
                                                )}
                                            />
                                            <Form.Field
                                                control={form.control}
                                                name="billing_address_name"
                                                render={({ field, fieldState }) => (
                                                    <Form.Item>
                                                        <Form.Label>Address Name</Form.Label>
                                                        <Form.Control>
                                                            <Input
                                                                autoComplete="off"
                                                                {...field}
                                                                disabled={!!form.watch("billing_address_id") || !!form.watch("billing_same_as_shipping")}
                                                            />
                                                        </Form.Control>
                                                        {fieldState.error && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                {fieldState.error.message}
                                                            </div>
                                                        )}
                                                    </Form.Item>
                                                )}
                                            /> <Form.Field
                                                control={form.control}
                                                name="billing_address_1"
                                                render={({ field, fieldState }) => (
                                                    <Form.Item>
                                                        <Form.Label>Address</Form.Label>
                                                        <Form.Control>
                                                            <Input
                                                                autoComplete="off"
                                                                {...field}
                                                                disabled={!!form.watch("billing_address_id") || form.watch("billing_same_as_shipping")}
                                                            />
                                                        </Form.Control>
                                                        {fieldState.error && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                {fieldState.error.message}
                                                            </div>
                                                        )}
                                                    </Form.Item>
                                                )}
                                            /> <Form.Field
                                                control={form.control}
                                                name="billing_phone_number"
                                                render={({ field, fieldState }) => (
                                                    <Form.Item>
                                                        <Form.Label>Phone Number</Form.Label>
                                                        <Form.Control>
                                                            <Input
                                                                autoComplete="off"
                                                                {...field}
                                                                disabled={!!form.watch("billing_address_id") || !!form.watch("billing_same_as_shipping")}
                                                            />
                                                        </Form.Control>
                                                        {fieldState.error && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                {fieldState.error.message}
                                                            </div>
                                                        )}
                                                    </Form.Item>
                                                )}
                                            />
                                            <Form.Field
                                                control={form.control}
                                                name="billing_company"
                                                render={({ field, fieldState }) => (
                                                    <Form.Item>
                                                        <Form.Label>Company</Form.Label>
                                                        <Form.Control>
                                                            <Input
                                                                autoComplete="off"
                                                                {...field}
                                                                disabled={!!form.watch("billing_address_id") || form.watch("billing_same_as_shipping")}
                                                            />
                                                        </Form.Control>
                                                        {fieldState.error && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                {fieldState.error.message}
                                                            </div>
                                                        )}
                                                    </Form.Item>
                                                )}
                                            />
                                            <Form.Field
                                                control={form.control}
                                                name="billing_postal_code"
                                                render={({ field, fieldState }) => (
                                                    <Form.Item>
                                                        <Form.Label>Pincode</Form.Label>
                                                        <Form.Control>
                                                            <Input
                                                                autoComplete="off"
                                                                {...field}
                                                                disabled={!!form.watch("billing_address_id") || form.watch("billing_same_as_shipping")}
                                                            />
                                                        </Form.Control>
                                                        {fieldState.error && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                {fieldState.error.message}
                                                            </div>
                                                        )}
                                                    </Form.Item>
                                                )}
                                            />
                                            <Form.Field
                                                control={form.control}
                                                name="billing_city"
                                                render={({ field, fieldState }) => (
                                                    <Form.Item>
                                                        <Form.Label>City</Form.Label>
                                                        <Form.Control>
                                                            <Input
                                                                autoComplete="off"
                                                                {...field}
                                                                disabled={!!form.watch("billing_address_id") || form.watch("billing_same_as_shipping")}
                                                            />
                                                        </Form.Control>
                                                        {fieldState.error && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                {fieldState.error.message}
                                                            </div>
                                                        )}
                                                    </Form.Item>
                                                )}
                                            />
                                            <Form.Field
                                                control={form.control}
                                                name="billing_country_code"
                                                render={({ field, fieldState }) => (
                                                    <Form.Item>
                                                        <Form.Label>Country </Form.Label>
                                                        <Form.Control>
                                                            <CountrySelect
                                                                {...field}
                                                                disabled={!!form.watch("billing_address_id") || form.watch("billing_same_as_shipping")}
                                                                countries={regions.options?.find((region) => region.value === form.getValues("region_id"))?.countries}
                                                                defaultValue={form.getValues("billing_country_code")}
                                                            />
                                                        </Form.Control>
                                                        {fieldState.error && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                {fieldState.error.message}
                                                            </div>
                                                        )}
                                                    </Form.Item>
                                                )}
                                            />
                                            <Form.Field
                                                control={form.control}
                                                name="billing_state"
                                                render={({ field, fieldState }) => (
                                                    <Form.Item>
                                                        <Form.Label>State</Form.Label>
                                                        <Form.Control>
                                                            <Input
                                                                autoComplete="off"
                                                                {...field}
                                                                disabled={!!form.watch("billing_address_id") || form.watch("billing_same_as_shipping")}
                                                            />
                                                        </Form.Control>
                                                        {fieldState.error && (
                                                            <div className="text-red-500 text-sm mt-1">
                                                                {fieldState.error.message}
                                                            </div>
                                                        )}
                                                    </Form.Item>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ProgressTabs.Content>
                    </RouteFocusModal.Body>
                </ProgressTabs>
                <RouteFocusModal.Footer>
                    <div className="flex items-center justify-end gap-x-2">
                        <RouteFocusModal.Close asChild>
                            <Button variant="secondary" size="small">
                                Cancel
                            </Button>
                        </RouteFocusModal.Close>

                        <Button
                            key="continue-btn"
                            type="button"
                            onClick={handleContinue}
                            size="small"
                        >
                            {tab === OrderCreateTab.CUSTOMER_ADDRESS ? (
                                form.formState.isSubmitting ? (
                                    <Spinner className="animate-spin" />
                                ) : (
                                    "Create Order"
                                )
                            ) : (
                                "Continue"
                            )}
                        </Button>
                    </div>
                </RouteFocusModal.Footer>
            </KeyboundForm>
        </RouteFocusModal>
    )
}

type VariantColumnsProps = {
    onQuantityChange: (variantId: string, quantity: number) => void
    quantities: Record<string, number>
}

const variantColumnHelper = createColumnHelper<HttpTypes.AdminProductVariant>()

const useVariantColumns = (
    {
        onQuantityChange,
        quantities,
    }: VariantColumnsProps

) => {
    // const { t } = useTranslation()

    return useMemo(
        () => [
            variantColumnHelper.display({
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllRowsSelected()
                                ? true
                                : table.getIsSomeRowsSelected()
                                    ? "indeterminate"
                                    : false
                        }
                        onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                ),
            }),
            variantColumnHelper.display({
                id: "product",
                header: () =>
                    //  <ProductHeader />
                    <div>Product</div>,
                cell: ({ row }) => (
                    // <ProductCell
                    //   product={
                    //     row.original.product as Pick<
                    //       HttpTypes.AdminProduct,
                    //       "title" | "thumbnail"
                    //     >
                    //   }
                    // />
                    <div>Product</div>
                ),
            }),
            variantColumnHelper.accessor("title", {
                header: () => <span>Variant</span>,
                cell: ({ row }) => (
                    <div>
                        <div className="text-sm text-gray-500">{row.original.title}</div>
                    </div>
                ),
            }),
            variantColumnHelper.accessor("prices", {
                header: () => <span>Price</span>,
                cell: ({ row }) => {
                    const defaultPrice = row.original.prices?.find(
                        (p: any) => p.currency_code === "inr"
                    )
                    return defaultPrice ? `${defaultPrice.amount.toFixed(2)}` : "-"
                },
            }),
            variantColumnHelper.display({
                id: "quantity",
                header: () => <div>Quantity</div>,
                cell: ({ row }) => {
                    if (!row.getIsSelected()) {
                        return null
                    }

                    const variantId = row.original.id
                    const currentQuantity = quantities[variantId] || 1

                    return (
                        <div className="flex items-center gap-x-2">
                            <IconButton
                                onClick={() => {
                                    const newQuantity = Math.max(1, currentQuantity - 1)
                                    onQuantityChange(variantId, newQuantity)
                                }}
                            >
                                <Minus />
                            </IconButton>
                            <Input
                                type="text"
                                min={1}
                                className="w-10 text-center"
                                value={currentQuantity}
                                onChange={(e) => {
                                    const quantity = parseInt(e.target.value) || 1
                                    onQuantityChange(variantId, quantity)
                                }}
                            />
                            <IconButton
                                onClick={() => {
                                    const newQuantity = currentQuantity + 1
                                    onQuantityChange(variantId, newQuantity)
                                }}
                            >
                                <Plus />
                            </IconButton>
                        </div>
                    )
                },
            }),
        ],
        [onQuantityChange, quantities]
    )
}

// const OrderCreateForm = () => {
//     return (
//         <div>Order Create</div>
//     )
// }
export { OrderCreateForm }

