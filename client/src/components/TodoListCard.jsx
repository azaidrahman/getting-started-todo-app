import { useCallback, useEffect, useMemo, useState } from 'react';
import { AddItemForm } from './AddNewItemForm';
import { ItemDisplay } from './ItemDisplay';
import { SearchSortBar } from './SearchSortBar'; //import search bar component

export function TodoListCard() {
    const [items, setItems] = useState(null);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('created');


    useEffect(() => {
        fetch('/api/items')
            .then((r) => r.json())
            .then(setItems);
    }, []);

    const onNewItem = useCallback(
        (newItem) => {
            // insert new item to the existing items array
            // The new item will be picked up by the useMemo filters/sorts automatically
            setItems((prev) => [...prev, newItem]);
        },
        [],
    );

    const onItemUpdate = useCallback(
        // Accept the updated item
        (item) => {
            setItems((prev) =>
                // Map over previous items: replace the matching item with the updated one
                prev.map((i) => (i.id === item.id ? item : i)),
            );
        },
        [],
    );

    // useCallbaack memorise the function for removing an item
    const onItemRemoval = useCallback(
        // Accept the item that should be removed
        (item) => {
            // Use functional updater to filter out the item by id
            setItems((prev) => prev.filter((i) => i.id !== item.id));
        },
        [],
    );

    const displayedItems = useMemo(() => {
        // if items is null (still loading), return empty array to prevent errors
        if (!items) return [];

        let result = [...items];

        // If user typed something in the search bar (non-empty string)...
        if (search) {
            // Convert input to lowercase for case-insensitive comparison
            const searchTerm = search.toLowerCase();

            result = result.filter((item) =>
                item.name.toLowerCase().includes(searchTerm),
            );
        }

        // Step 2: Sort 
        result.sort((a, b) => {
            // If the user selected "created" sort (default)...
            if (sort === 'created') {
                // Items from the DB come back in insertion order (roughly by creation time)
                // Use the index in the original `items` array to preserve that order
                return items.indexOf(a) - items.indexOf(b);
            }
            // If the user selected "priority" sort
            if (sort === 'priority') {
                // Define a numeric ranking for each priority level (lower number = higher priority)
                const rank = { high: 1, med: 2, low: 3 };

                return (rank[a.priority] || 4) - (rank[b.priority] || 4);
            }
            // If the user selected "due" sort
            if (sort === 'due') {
                // Convert due_date strings to Date objects for comparison
                // If an item has no due_date, use a far-future date (year 9999) so it sorts last
                const dateA = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
                const dateB = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');

                return dateA - dateB;
            }
            // no sort change, keep original order
            return 0;
        });

        return result;
    }, 
    
    [items, search, sort]); 

    if (items === null) return 'Loading...';

    return (
        // React Fragment groups elements without adding an extra DOM node
        <>
            <AddItemForm onNewItem={onNewItem} />

            <SearchSortBar
                search={search}
                onSearchChange={setSearch}
                sort={sort}
                onSortChange={setSort}
            />
            
            {/* Show a message when there are no items to display */}
            {displayedItems.length === 0 && (
                <p className="text-center">
                    {/* Show different message depending on whether the user searched */}
                    {/* If search is empty, then there are no items in the db */}
                    {search ? 'No items match your search.' : 'No items yet! Add one above!'}
                </p>
            )}

            {displayedItems.map((item) => (
                <ItemDisplay
                    key={item.id}
                    item={item}
                    onItemUpdate={onItemUpdate}
                    onItemRemoval={onItemRemoval}
                />
            ))}
        </>
    );
}
