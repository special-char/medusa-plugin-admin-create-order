import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import {
	CustomerDTO,
	INotificationModuleService,
} from "@medusajs/framework/types";
import {
	Modules,
} from "@medusajs/framework/utils";
import {
	createCartWorkflow,
	createCustomerAddressesWorkflow,
	createCustomersWorkflow,
	listShippingOptionsForCartWorkflow,
	updateCartPromotionsWorkflow,
	updateCartWorkflow,
} from "@medusajs/medusa/core-flows";

export async function POST(
	req: MedusaRequest<{
		currency_code?: string;
		sales_channel_id?: string;
		promotionCodes?: string[];
		region_id: string;
		user: Record<string, any>;
		sendCorporateEmail?: string;
		items: Record<string, any>[];
		customer_address_id?: string;
		address_line1?: string;
		address_line2?: string;
		city?: string;
		country_code?: string;
		province?: string;
		postal_code?: string;
		shipping_address?: {
			address_name: string;
			address_1: string;
			address_2?: string;
			city?: string;
			country_code: string;
			province?: string;
			postal_code?: string;
			company?: string;
			first_name: string;
			last_name: string;
			phone?: string;
			is_existing_address?: boolean;
			address_id?: string;
		};
		billing_address?: {
			address_name: string;
			address_1: string;
			address_2?: string;
			city?: string;
			country_code: string;
			province?: string;
			postal_code?: string;
			company?: string;
			first_name: string;
			last_name: string;
			phone?: string;
			is_existing_address?: boolean;
			address_id?: string;
		};
		billing_same_as_shipping?: boolean;
		shipping_option_id?: string;
	}>,
	res: MedusaResponse
) {
	try {
		const query = req.scope.resolve("query");
		const service = req.scope.resolve<INotificationModuleService>(
			Modules.NOTIFICATION
		);

		const {
			region_id,
			currency_code,
			sales_channel_id,
			promotionCodes,
			items,
			user,
			shipping_address,
			billing_address,
			billing_same_as_shipping,
			shipping_option_id
		} = req.body;

		const transformedItems = items?.map((item) => {
			return {
				quantity: item?.quantity,
				product_id: item?.product_id,
				variant_id: item?.variant_id,
			};
		});

		const additionalData = {
			currency_code,
			sales_channel_id,
			region_id,
		};

		let errorMessages: string[] = [];

		const responseData = {
			items: transformedItems,
			additionalData,
		};

		let customer: CustomerDTO | null = null;
		const customerService = req.scope.resolve("customer");
		const customerRetrieve = await customerService.listCustomers({
			email: user?.email,
		});

		if (customerRetrieve[0]) {
			customer = customerRetrieve[0];
			if (!customerRetrieve[0].has_account) {
				// await customerInviteFuncion({ ids: [customerRetrieve[0].id] });
			}
		} else {
			const { result: customerResults } = await createCustomersWorkflow(
				req.scope
			).run({
				input: {
					customersData: [
						{
							email: user?.email,
							first_name: user?.first_name || "",
							last_name: user?.last_name || "",
							phone: user?.phone || "",
							company_name: user?.company_name || "",
						},
					],
					additional_data: {},
				},
			});
			if (customerResults) {
				// await customerInviteFuncion({ ids: [customerResults[0].id] });
			}
			customer = customerResults[0];
		}

		if (shipping_address && !shipping_address.is_existing_address) {
			const { result: customerAddress } = await createCustomerAddressesWorkflow(req.scope).run({
				input: {
					addresses: [{
						address_1: shipping_address.address_1,
						address_2: shipping_address.address_2,
						customer_id: customer?.id,
						city: shipping_address.city,
						country_code: shipping_address.country_code,
						province: shipping_address.province,
						postal_code: shipping_address.postal_code,
						company: shipping_address.company,
						first_name: shipping_address.first_name,
						last_name: shipping_address.last_name,
						phone: shipping_address.phone,
						address_name: shipping_address.address_name,
					}]
				},
			});
		}
		if (billing_address && !billing_address.is_existing_address && !billing_same_as_shipping) {
			const { result: customerAddress } = await createCustomerAddressesWorkflow(req.scope).run({
				input: {
					addresses: [{
						address_1: billing_address.address_1,
						address_2: billing_address.address_2,
						customer_id: customer?.id,
						city: billing_address.city,
						country_code: billing_address.country_code,
						province: billing_address.province,
						postal_code: billing_address.postal_code,
						company: billing_address.company,
						first_name: billing_address.first_name,
						last_name: billing_address.last_name,
						phone: billing_address.phone,
						address_name: billing_address.address_name,
					}]
				},
			});
		}

		const { result: cart } = await createCartWorkflow(req.scope).run({
			input: {
				items: responseData.items,
				sales_channel_id: additionalData?.sales_channel_id,
				currency_code: additionalData?.currency_code,
				customer_id: customer?.id,
				email: customer?.email,
				region_id: additionalData.region_id,
			},
		});

		const cartUpdateData: any = {};

		if (shipping_address) {
			cartUpdateData.shipping_address = {
				address_1: shipping_address.address_1,
				address_2: shipping_address.address_2,
				city: shipping_address.city,
				country_code: shipping_address.country_code,
				province: shipping_address.province,
				postal_code: shipping_address.postal_code,
				company: shipping_address.company,
				first_name: shipping_address.first_name,
				last_name: shipping_address.last_name,
				phone: shipping_address.phone,
			};

		}

		if (billing_address) {
			cartUpdateData.billing_address = {
				address_1: billing_address.address_1,
				address_2: billing_address.address_2,
				city: billing_address.city,
				country_code: billing_address.country_code,
				province: billing_address.province,
				postal_code: billing_address.postal_code,
				company: billing_address.company,
				first_name: billing_address.first_name,
				last_name: billing_address.last_name,
				phone: billing_address.phone,
			};

		}

		await updateCartWorkflow(req.scope).run({
			input: {
				id: cart?.id,
				...cartUpdateData,
			},
		});

		if (promotionCodes?.length) {
			await updateCartPromotionsWorkflow(req.scope).run({
				input: {
					promo_codes: promotionCodes,
					cart_id: cart.id,
				},
			});

			const { data: promotionCart } = await query.graph({
				entity: "cart",
				fields: ["promotions.*"],
				filters: {
					id: cart.id,
				},
			});

			const appliedCodes =
				promotionCart[0].promotions?.map((p) => p?.code) ?? [];

			const isValid = promotionCodes.every((code) =>
				appliedCodes.includes(code)
			);

			if (!appliedCodes.length || !isValid) {
				throw new Error("One or more promotion codes are invalid");
			}
		}

		const { result: shipping_options } =
			await listShippingOptionsForCartWorkflow(req.scope).run({
				input: {
					cart_id: cart?.id,
				},
			});
		
		await service.createNotifications([
			{
				to: "",
				channel: "feed",
				template: "admin-ui",
				data: {
					title: "Create Order",
					description: `Order create completed successfully!`,
				},
			},
		]);

		if (errorMessages.length > 0) {
			throw new Error(errorMessages.join("\n"));
		}
		return res.status(200).json({ cartId: cart?.id, shipping_options });
	} catch (error) {
		console.error("Error processing request:", error);
		const service = req.scope.resolve<INotificationModuleService>(
			Modules.NOTIFICATION
		);
		await service.createNotifications([
			{
				to: "",
				channel: "feed",
				template: "admin-ui",
				data: {
					title: "Create Order",
					description: error.message,
				},
			},
		]);
		return res.status(500).json({
			error: error.message || "Failed to create order. Please try again.",
			message: error.message || "something went wrong...",
		});
		return;
	}
}
