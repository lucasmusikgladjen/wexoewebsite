<?php
/**
 * Entity schema: automation_product_navigation
 *
 * Navigation-länkar i mega-meny (gamla Product navigation-tabellen).
 * Airtable-tabell: cms_product_navigation i Wexoe NY (skapad i migrationen).
 */

if (!defined('ABSPATH')) exit;

return [
    'base_id' => \Wexoe\Core\Plugin::SSOT_BASE_ID,
    'table_id' => null, // Sätts efter MCP-skapande
    'cache_ttl' => 86400,
    'required' => ['name', 'type'],
    'fields' => [
        'name' => 'name',
        'internal_notes' => 'internal_notes',
        'is_active' => ['source' => 'is_active', 'type' => 'bool'],
        'order' => ['source' => 'order', 'type' => 'float'],
        'type' => 'type',
        'url' => 'url',
        'icon' => 'icon',
        'description' => 'description',
        'button_text' => 'button_text',
        'benefit_1' => 'benefit_1',
        'benefit_2' => 'benefit_2',
        'division_ids' => ['source' => 'division_ids', 'type' => 'link', 'entity' => 'core_divisions'],
    ],
];
