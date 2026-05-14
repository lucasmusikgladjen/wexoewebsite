<?php
/**
 * Entity schema: partner_pages
 *
 * Dedikerade publika partner-sidor. Innehåll kombinerar publika fält i denna
 * tabell med data hämtad via scope från `core_partners`.
 * Airtable-tabell: cms_partner_pages (tblQv5E8pSgwxy6wU) i Wexoe NY.
 */

if (!defined('ABSPATH')) exit;

return [
    'base_id' => \Wexoe\Core\Plugin::SSOT_BASE_ID,
    'table_id' => 'tblQv5E8pSgwxy6wU',
    'primary_key' => 'slug',
    'cache_ttl' => 86400,
    'required' => ['slug'],
    'fields' => [
        'slug' => 'slug',
        'internal_notes' => 'internal_notes',
        'is_active' => ['source' => 'is_active', 'type' => 'bool'],
        'country_ids' => ['source' => 'country_ids', 'type' => 'link', 'entity' => 'core_countries'],
        'partner_ids' => ['source' => 'partner_ids', 'type' => 'link', 'entity' => 'core_partners'],
        'h1' => 'h1',
        'hero_description' => 'hero_description',
        'hero_image_url' => 'hero_image_url',
        'hero_cta_text' => 'hero_cta_text',
        'hero_cta_url' => 'hero_cta_url',
        'body_markdown' => 'body_markdown',

        // Contact Form (delad med ContactForm-renderer)
        'show_contact_form' => ['source' => 'show_contact_form', 'type' => 'bool'],
        'contact_form_eyebrow' => 'contact_form_eyebrow',
        'contact_form_title' => 'contact_form_title',
        'contact_form_subtitle' => 'contact_form_subtitle',
        'contact_form_layout' => 'contact_form_layout',
        'contact_form_theme' => 'contact_form_theme',
        'contact_form_show_company' => ['source' => 'contact_form_show_company', 'type' => 'bool'],
        'contact_form_show_phone' => ['source' => 'contact_form_show_phone', 'type' => 'bool'],
        'contact_form_show_dropdown' => ['source' => 'contact_form_show_dropdown', 'type' => 'bool'],
        'contact_form_dropdown_label' => 'contact_form_dropdown_label',
        'contact_form_options' => ['source' => 'contact_form_options', 'type' => 'lines'],
        'contact_form_cta_text' => 'contact_form_cta_text',
        'contact_form_message_label' => 'contact_form_message_label',
        'contact_form_trust_signals' => ['source' => 'contact_form_trust_signals', 'type' => 'lines'],
        'contact_form_show_contact_person' => ['source' => 'contact_form_show_contact_person', 'type' => 'bool'],
    ],
];
