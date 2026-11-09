export default function TamilAddressFields({ address, onChange }) {
    function updateField(field, value) {
        onChange((current) => ({ ...current, [field]: value }))
    }

    return (
        <div className="address-fields">
            <label>
                <span>City / town</span>
                <input
                    value={address.city || ''}
                    onChange={(event) => updateField('city', event.target.value)}
                    placeholder="City or town"
                />
            </label>
            <label>
                <span>Street</span>
                <input
                    value={address.street}
                    onChange={(event) => updateField('street', event.target.value)}
                    placeholder="Street"
                />
            </label>
        </div>
    )
}
