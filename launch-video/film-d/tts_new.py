"""Voiceover with word timings: ElevenLabs, narrator Eric. Reads the key from ELEVENLABS_API_KEY."""
import base64, json, os, urllib.request
VOICE = 'cjVigY5qzO86Huf0OWal'
key = os.environ['ELEVENLABS_API_KEY']
lines = json.load(open('vo_new.json'))
words = {}
for i, line in enumerate(lines):
    body = {'text': line['text'], 'model_id': 'eleven_multilingual_v2',
            'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.2, 'use_speaker_boost': True},
            'previous_text': lines[i - 1]['text'] if i else None, 'next_text': lines[i + 1]['text'] if i + 1 < len(lines) else None}
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_192',
                                 data=json.dumps(body).encode(), headers={'xi-api-key': key, 'content-type': 'application/json'})
    r = json.load(urllib.request.urlopen(req))
    open(f"assets/voice/{line['id']}.mp3", 'wb').write(base64.b64decode(r['audio_base64']))
    a = r['alignment']
    ws, cur, start = [], '', None
    for ch, t0, t1 in zip(a['characters'], a['character_start_times_seconds'], a['character_end_times_seconds']):
        if ch == ' ':
            if cur: ws.append([cur, start, t1])
            cur, start = '', None
        else:
            if start is None: start = t0
            cur += ch; end = t1
    if cur: ws.append([cur, start, end])
    words[line['id']] = ws
    print(line['id'], 'ok', round(ws[-1][2], 2))
old = json.load(open('vo_words.json')); old.update(words); json.dump(old, open('vo_words.json', 'w'), indent=1)
