export async function publishActivity(client, activity, ownerId) {
    if (activity.type === "event") {
        const result = await client.rpc("feed_publish_event", {
            event_key: activity.eventKey, body: activity.body, event_at: activity.eventAt,
            audience: activity.audience || null, comments_enabled: activity.commentsEnabled ?? true,
            expected_owner: ownerId
        });
        if (result.error) throw new Error(result.error.message);
        return result.data;
    }
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
