// Match only our known database exception messages. Never expose raw provider
// errors, details, hints, row contents, hashes, or customer information.
export function checkoutReservationFailure(error: { code?: string; message?: string } | null) {
  if (error?.code === "PGRST202" || error?.code === "42883" || error?.code === "42703" || error?.code === "42P01") {
    return { status: 503, error: "Checkout database setup is incomplete. Please contact the store." };
  }
  if (error?.code === "P0001") {
    switch (error.message) {
      case "Too many checkout attempts":
        return { status: 429, error: "Too many checkout attempts. Wait 30 minutes before starting another checkout." };
      case "Design mismatch":
      case "Checkout request does not match":
        return { status: 409, error: "An earlier checkout for this cart has different design details. Return to the cart and continue or remove that pending checkout before trying again." };
      case "Checkout already finished":
        return { status: 409, error: "This checkout has already finished. Refresh your cart and check your receipt before paying again." };
      case "Size sold out":
      case "Product sold out":
      case "Size unavailable":
      case "Product unavailable":
      case "Custom product unavailable":
        return { status: 409, error: "A selected product or size is no longer available in that quantity. Refresh your cart and check stock before trying again." };
      case "Invalid print size":
      case "Invalid print side":
      case "Invalid custom design":
      case "Invalid headwear print":
        return { status: 409, error: "The saved print options could not be reserved. Reopen and save the custom design, then review your cart again." };
    }
  }
  return { status: 409, error: "Unable to reserve this cart. Refresh the cart to check current sizes, stock, and prices, then try again." };
}
