import { useEffect, useState } from 'react'

const TAMIL_NADU_DISTRICTS = [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
    'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanniyakumari', 'Karur',
    'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal',
    'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga',
    'Tenkasi', 'Thanjavur', 'Theni', 'The Nilgiris', 'Thoothukudi', 'Tiruchirappalli',
    'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai',
    'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar',
]

let localityOptionsPromise

function loadLocalityOptions() {
    if (!localityOptionsPromise) {
        localityOptionsPromise = fetch(`${import.meta.env.BASE_URL}data/tamil-nadu-localities.json.gz`)
            .then((response) => {
                if (!response.ok) throw new Error('Unable to load Tamil Nadu locality suggestions.')
                return response.json()
            })
            .then((localities) => {
                const groupedLocalities = localities.reduce((districts, locality) => {
                    const districtMap = districts[locality.district] || (districts[locality.district] = new Map())
                    const areaKey = locality.area.toLocaleLowerCase()
                    const area = districtMap.get(areaKey) || { name: locality.area, pincodes: [] }

                    if (!area.pincodes.includes(locality.pincode)) {
                        area.pincodes.push(locality.pincode)
                    }

                    districtMap.set(areaKey, area)
                    return districts
                }, {})

                return Object.fromEntries(
                    Object.entries(groupedLocalities).map(([district, areas]) => [
                        district,
                        [...areas.values()].sort((firstArea, secondArea) => firstArea.name.localeCompare(secondArea.name)),
                    ])
                )
            })
    }

    return localityOptionsPromise
}

export default function TamilAddressFields({ idPrefix, address, onChange }) {
    const [localitiesByDistrict, setLocalitiesByDistrict] = useState({})
    const localities = localitiesByDistrict[address.district] || []
    const localityListId = `${idPrefix}-localities`

    useEffect(() => {
        let ignore = false

        loadLocalityOptions()
            .then((options) => {
                if (!ignore) setLocalitiesByDistrict(options)
            })
            .catch(() => { })

        return () => {
            ignore = true
        }
    }, [])

    function updateField(field, value) {
        onChange((current) => ({ ...current, [field]: value }))
    }

    function updateArea(value) {
        const matchingArea = localities.find(
            (locality) => locality.name.toLocaleLowerCase() === value.trim().toLocaleLowerCase()
        )
        const pincode = matchingArea?.pincodes.length === 1 ? matchingArea.pincodes[0] : ''

        onChange((current) => ({ ...current, area: value, pincode }))
    }

    return (
        <div className="address-fields">
            <label>
                <span>State</span>
                <input value="Tamil Nadu" readOnly />
            </label>
            <label>
                <span>District</span>
                <select
                    value={address.district}
                    onChange={(event) => onChange((current) => ({ ...current, district: event.target.value, area: '', pincode: '' }))}
                >
                    <option value="">Choose a district</option>
                    {TAMIL_NADU_DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
                </select>
            </label>
            <label>
                <span>Town / village</span>
                <input
                    list={localityListId}
                    value={address.area}
                    disabled={!address.district}
                    placeholder={address.district ? 'Choose or enter a town / village' : 'Choose a district first'}
                    onChange={(event) => updateArea(event.target.value)}
                />
                <datalist id={localityListId}>
                    {localities.map((locality) => (
                        <option key={locality.name} value={locality.name} label={locality.pincodes.join(', ')} />
                    ))}
                </datalist>
            </label>
            <label>
                <span>Street / address</span>
                <input value={address.street} onChange={(event) => updateField('street', event.target.value)} placeholder="Street, door number, landmark" />
            </label>
            <label>
                <span>City / taluk</span>
                <input value={address.city} onChange={(event) => updateField('city', event.target.value)} />
            </label>
            <label>
                <span>PIN code</span>
                <input
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={address.pincode}
                    onChange={(event) => updateField('pincode', [...event.target.value].filter((character) => character >= '0' && character <= '9').join('').slice(0, 6))}
                    placeholder="6-digit PIN code"
                />
            </label>
        </div>
    )
}