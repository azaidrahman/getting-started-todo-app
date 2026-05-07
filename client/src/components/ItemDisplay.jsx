import PropTypes from 'prop-types';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import faCheckSquare from '@fortawesome/fontawesome-free-regular/faCheckSquare';
import faSquare from '@fortawesome/fontawesome-free-regular/faSquare';
import './ItemDisplay.scss';
import React from 'react';

const PRIORITY_COLORS = {
    low: { variant: 'success', label: 'Low' },
    medium: { variant: 'warning', label: 'Medium' },
    high: { variant: 'danger', label: 'High' },
};
function PriorityBadge({ priority }) {
    const config = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium;
    return (
        <span className={`badge bg-${config.variant}`}>{config.label}</span>
    );
}

//shows due date
function DueDateDisplay({ dueDate, completed }) {
    if (!dueDate) return null;
    const today = new Date().toISOString().slice(0, 10);
    const isOverdue = !completed && dueDate < today;
    return (
        <span className="due-date ms-2">
            <small className="text-muted">Due: {dueDate}</small>
            {isOverdue && (
                <span className='badge bg-danger ms-1'>Overdue</span>
            )}
        </span>
    );

}
export function ItemDisplay({ item, onItemUpdate, onItemRemoval }) {
    const toggleCompletion = () => {
        fetch(`/api/items/${item.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                ...item,
                completed: !item.completed,
            }),
            headers: { 'Content-Type': 'application/json' },
        })
            .then(r => r.json())
            .then(updatedItem => onItemUpdate(updatedItem));
    };

    const removeItem = () => {
        fetch(`/api/items/${item.id}`, { method: 'DELETE' }).then(() =>
            onItemRemoval(item),
        );
    };

    const today = new Date().toISOString().slice(0, 10);
    const isOverdue = item.due_date && !item.completed && item.due_date < today;
    return (
        <Container fluid className={`item ${item.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}>
            <Row>
                <Col xs={2} className="text-center">
                    <Button
                        className="toggles"
                        size="sm"
                        variant="link"
                        onClick={toggleCompletion}
                        aria-label={
                            item.completed
                                ? 'Mark item as incomplete'
                                : 'Mark item as complete'
                        }
                    >
                        <FontAwesomeIcon
                            icon={item.completed ? faCheckSquare : faSquare}
                        />
                        <i
                            className={`far ${item.completed ? 'fa-check-square' : 'fa-square'
                                }`}
                        />
                    </Button>
                </Col>
                <Col xs={8} className="name">
                    <PriorityBadge priority={item.priority} />
                    {item.name}
                    <DueDateDisplay dueDate={item.due_date}
                        completed={item.completed} />
                </Col>
                <Col xs={2} className="text-center remove">
                    <Button
                        size="sm"
                        variant="link"
                        onClick={removeItem}
                        aria-label="Remove Item"
                    >
                        <FontAwesomeIcon
                            icon={faTrash}
                            className="text-danger"
                        />
                    </Button>
                </Col>
            </Row>
        </Container>
    );
}

ItemDisplay.propTypes = {
    item: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        completed: PropTypes.bool,
        due_date: PropTypes.string, //add this too
    }),
    onItemUpdate: PropTypes.func,
    onItemRemoval: PropTypes.func,
};
