<?php
/**
 * Write-entity schema: user_submissions
 *
 * Samlar in alla typer av användarinlämningar från Wexoe-plugins:
 * lead magnets, eventanmälningar, kontaktformulär, bokningar, etc.
 *
 * Airtable-tabell: User data (tblxrwMhSysupcDwe)
 * Bas: Wexoe (appXoUcK68dQwASjF)
 *
 * Skalbarhetsdesign:
 *   - Fält som inte behövs för en viss inlämningstyp lämnas tomma.
 *   - Typ-specifik data som inte har ett dedikerat fält skickas som
 *     JSON i "Extra"-fältet via nyckeln 'extra'.
 *   - Nya inlämningstyper kan lägga till fält till detta schema eller
 *     packa extra data i 'extra' utan att behöva ändra Airtable-strukturen.
 */

if (!defined('ABSPATH')) exit;

return [
    'table_id' => 'tblxrwMhSysupcDwe',

    /**
     * Fältmappning: domän-nyckel => Airtable-fältnamn
     *
     * Domän-nycklar används i Core::submission('user_submissions')->create_mapped([...]).
     * Lägg till fler nycklar här om nya Airtable-fält skapas i framtiden.
     */
    'fields' => [
        // Identitet
        'submission_id'      => 'ID',               // UUID genererat av plugin
        'email'              => 'Email',
        'name'               => 'Name',
        'company'            => 'Company',
        'phone'              => 'Phone',

        // Metadata
        'submission_type'    => 'Submission Type',  // singleSelect: leadmagnet|event|contact|booking|calculator|download|form|other
        'submitted_at'       => 'Submitted At',     // ISO 8601 datetime
        'page_slug'          => 'Page Slug',
        'page_url'           => 'URL',
        'source_plugin'      => 'Source Plugin',    // t.ex. "wexoe-landing-page"

        // Innehåll
        'message'            => 'Message',
        'newsletter_consent' => 'Newsletter Consent', // bool

        // Typ-specifika fält
        'magnet_name'        => 'Magnet Name',      // leadmagnet: vilken resurs
        'event_title'        => 'Event Title',      // event: vilket evenemang
        'calculator_data'    => 'Calculator Data',  // calculator: indata + resultat (JSON/text)

        // CRM
        'sent_to_crm'        => 'Sent to CRM',     // bool, sätts manuellt eller av automation

        // Spill: valfri JSON för plugin-specifika fält utan dedikerad kolumn
        'extra'              => 'Extra',
    ],
];
