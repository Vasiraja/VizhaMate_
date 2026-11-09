export function formatTamilAddress(address) {
    return [address.street, address.city || address.area]
        .filter(Boolean)
        .join(', ')
}