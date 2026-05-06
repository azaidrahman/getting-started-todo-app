import { useState } from 'react';
import PropTypes from 'prop-types';
import { InputGroup, Form, Button } from 'react-bootstrap';

export function AddItemForm({ onNewItem }) {
    const [newItem, setNewItem] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [priority, setPriority] = useState('medium');

    const submitNewItem = (e) => {
        e.preventDefault();
        setSubmitting(true);

        const options = {
            method: 'POST',
            body: JSON.stringify({ name: newItem, priority }),
            headers: { 'Content-Type': 'application/json' },
        };

        fetch('/api/items', options)
            .then(r => r.json())
            .then(item => {
                onNewItem(item);
                setSubmitting(false);
                setNewItem('');
                setPriority('medium');
            });
    };

    return (
        <InputGroup className="mb-3">
            {/* NEW: priority selector */}
            <Form.Select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                style={{ maxWidth: '120px' }}
                aria-label="Priority"
            >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
            </Form.Select>

            <Form.Control
                placeholder="New Item"
                aria-describedby="basic-addon2"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyUp={e => { if (e.key === 'Enter') submitNewItem(); }}
            />
            <Button
                variant="success"
                disabled={!newItem.length}
                onClick={submitNewItem}
            >
                {submitting ? 'Adding...' : 'Add Item'}
            </Button>
        </InputGroup>
    );
}

AddItemForm.propTypes = {
    onNewItem: PropTypes.func,
};
