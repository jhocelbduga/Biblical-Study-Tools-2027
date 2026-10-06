export async function publishActivity(client, activity, ownerId) {
    const result = await client.rpc("feed_publish", {
        activity_type: activity.type, event_key: activity.eventKey,
        body: activity.body, audience: activity.audience || null,
        comments_enabled: activity.commentsEnabled ?? true,
        verse_reference: activity.reference || "", verse_text: activity.text || "",
        source_id: activity.sourceId || null, expected_owner: ownerId
    });
    if (result.error) throw new Error(result.error.message);
    return result.data;
}
