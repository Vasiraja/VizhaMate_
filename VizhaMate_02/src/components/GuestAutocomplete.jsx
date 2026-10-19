import { useMemo, useState } from 'react';
import { MapPin, Phone } from 'lucide-react';

export default function GuestAutocomplete({ people, value, onChange, onSelect, onCreateNew }) {
    const [open, setOpen] = useState(false);
    const suggestions = useMemo(() => {
        const query = value.trim().toLocaleLowerCase();
        if (query.length < 2) return [];
        return people.filter((person) => person.normalized_name.includes(query)).slice(0, 6);
    }, [people, value]);

    return (
        <div className="autocomplete-wrap">
            <input
                id="guest-name"
                autoComplete="off"
                required
                value={value}
                placeholder="Type a guest name"
                onFocus={() => setOpen(true)}
                onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                onChange={(event) => onChange(event.target.value)}
            />
            {open && value.trim().length >= 2 && (
                <div className="suggestions" role="listbox">
                    {suggestions.map((person) => (
                        <button type="button" key={person.person_id} role="option" className="suggestion-item" onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(person); setOpen(false); }}>
                            <span className="suggestion-avatar">{person.full_name[0]?.toUpperCase()}</span>
                            <span className="suggestion-copy"><strong>{person.full_name}</strong><small>{person.village || 'Location not added'}{person.phone ? ` · ••${person.phone.slice(-4)}` : ''}</small></span>
                            {person.phone && <Phone size={14} className="muted-icon" />}
                            {person.village && <MapPin size={14} className="muted-icon" />}
                        </button>
                    ))}
                    <button type="button" className="suggestion-create" onMouseDown={(event) => event.preventDefault()} onClick={() => { onCreateNew(); setOpen(false); }}>+ Add “{value.trim()}” as a new guest</button>
                </div>
            )}
        </div>
    );
}