SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint
WHERE conrelid = 'chapters'::regclass AND contype = 'c'
ORDER BY conname;
