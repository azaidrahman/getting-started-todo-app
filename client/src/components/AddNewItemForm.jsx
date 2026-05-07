import { useState } from 'react';
import PropTypes from 'prop-types';
import { InputGroup, Form, Button } from 'react-bootstrap';

export function AddItemForm({ onNewItem }) {
    const [newItem, setNewItem] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');

    const submitNewItem = (e) => {
        e.preventDefault();
        setSubmitting(true);

        const options = {
            method: 'POST',
            body: JSON.stringify({ name: newItem, priority, due_date: dueDate || null }),//due date included
            headers: { 'Content-Type': 'application/json' },
        };

        fetch('/api/items', options)
            .then(r => r.json())
            .then(item => {
                onNewItem(item);
                setSubmitting(false);
                setNewItem('');
                setPriority('medium');
                setDueDate(''); //duedate included
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
            
            <Form.Control
                type='date'
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                aria-label='Due Date'
                style={{ maxWidth: '140px' }}
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
