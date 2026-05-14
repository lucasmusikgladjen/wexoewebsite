<?php
/**
 * Entity schema: automation_offerings
 *
 * Erbjudande-block (gamla Offerings-tabellen).
 * Airtable-tabell: cms_offerings i Wexoe NY (skapad i migrationen).
 */

if (!defined('ABSPATH')) exit;

return [
    'base_id' => \Wexoe\Core\Plugin::SSOT_BASE_ID,
    'table_id' => null, // Sätts efter MCP-skapande
    'cache_ttl' => 86400,
    'required' => ['name'],
    'fields' => [
        'name' => 'name',
        'internal_notes' => 'internal_notes',
        'is_active' => ['source' => 'is_active', 'type' => 'bool'],
        'order' => ['source' => 'order', 'type' => 'float'],
        'division' => 'division',
        'heading' => 'heading',
        'description' => 'description',
        'image_url' => 'image_url',
        'benefit_1' => 'benefit_1',
        'benefit_2' => 'benefit_2',
        'benefit_3' => 'benefit_3',
        'benefit_4' => 'benefit_4',
        'benefit_5' => 'benefit_5',
        'cta_text' => 'cta_text',
        'cta_url' => 'cta_url',
    ],
];
