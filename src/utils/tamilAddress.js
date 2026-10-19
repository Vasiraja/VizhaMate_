export function formatTamilAddress(address) {
    return [address.street, address.area, address.city, address.district, 'Tamil Nadu', address.pincode]
        .filter(Boolean)
        .join(', ')
}