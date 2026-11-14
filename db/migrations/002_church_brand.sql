-- The name shown in place of "Plenix" (#8): added to the parish settings of a database made before it existed.
UPDATE settings SET value = value || '{"brand": "ST. JOHN COPTIC ORTHODOX CHURCH"}'::jsonb WHERE key = 'church';
