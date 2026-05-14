<?php
/**
 * Entity schema: case_pages
 *
 * Kundcase som tidigare låg som inline-fält på Customer types (Audience Heroes).
 * Airtable-tabell: cms_case_pages (tbl3uMV6IpRIZeucA) i Wexoe NY.
 *
 * Refereras från `audience_heroes` (entity) via `case_ids`-länken.
 */

if (!defined('ABSPATH')) exit;

return [
    'base_id' => \Wexoe\Core\Plugin::SSOT_BASE_ID,
    'table_id' => 'tbl3uMV6IpRIZeucA',
    'primary_key' => 'slug',
    'cache_ttl' => 86400,
    'required' => ['slug'],
    'fields' => [
        'slug' => 'slug',
        'internal_notes' => 'internal_notes',
        'is_active' => ['source' => 'is_active', 'type' => 'bool'],
        'country_ids' => ['source' => 'country_ids', 'type' => 'link', 'entity' => 'core_countries'],
        'customer_type_ids' => ['source' => 'customer_type_ids', 'type' => 'link', 'entity' => 'core_customer_types'],
        'title' => 'title',
        'description' => 'description',
        'result' => 'result',
        'link_text' => 'link_text',
        'link_url' => 'link_url',
    ],
];
