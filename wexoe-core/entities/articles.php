<?php
/**
 * Entity schema: articles
 *
 * Renderings-metadata för artiklar (publika produktdatablad-länkar).
 * Airtable-tabell: cms_articles (tblhnz3MQG1JwfKrN) i Wexoe NY.
 *
 * `article_number` är förberedelsefält för framtida PIM-koppling. Idag är
 * Airtable källan; när PIM-integration är på plats spegelförs det fältet
 * från PIM:en till en separat `pim_articles`-tabell.
 */

if (!defined('ABSPATH')) exit;

return [
    'base_id' => \Wexoe\Core\Plugin::SSOT_BASE_ID,
    'table_id' => 'tblhnz3MQG1JwfKrN',
    'primary_key' => 'name',
    'cache_ttl' => 86400,
    'required' => ['name'],
    'fields' => [
        'name' => 'name',
        'internal_notes' => 'internal_notes',
        'is_active' => ['source' => 'is_active', 'type' => 'bool'],
        'article_number' => 'article_number',
        'description' => 'description',
        'datasheet_url' => 'datasheet_url',
        'webshop_url' => 'webshop_url',
        'image_url' => 'image_url',
        'variants' => 'variants',
        'product_ids' => ['source' => 'product_ids', 'type' => 'link', 'entity' => 'products'],
        'supplier_ids' => ['source' => 'supplier_ids', 'type' => 'link', 'entity' => 'core_partners'],
    ],
];
