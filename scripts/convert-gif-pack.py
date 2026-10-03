"""Converte os GIFs do pacote (ADR 0011) para WebP animado + miniatura estática.

Lê supabase/seed/gif-pack.json e, para cada exercício, o GIF original em
<raw_dir>/<drive_id>.gif. Grava em <out_dir>:
  <slug>.webp        animação, lado maior de até 360 px
  <slug>.thumb.webp  primeiro quadro recortado no conteúdo, quadrado de 160 px
Idempotente: pula o que já existe; grava em arquivo temporário e renomeia, para
uma interrupção não deixar arquivo pela metade. Requer Pillow (pip install pillow).

Uso: python3 scripts/convert-gif-pack.py <raw_dir> <out_dir>
"""

import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image, ImageChops, ImageSequence

ANIMATION_SIDE = 360
THUMB_SIDE = 160


def convert(source, animation_path, thumb_path):
    image = Image.open(source)
    frames, durations = [], []
    for frame in ImageSequence.Iterator(image):
        rgb = frame.convert('RGB')
        rgb.thumbnail((ANIMATION_SIDE, ANIMATION_SIDE), Image.LANCZOS)
        frames.append(rgb)
        durations.append(frame.info.get('duration') or 80)
    if len(frames) < 2:
        raise ValueError('GIF sem animação')
    frames[0].save(
        animation_path + '.tmp',
        format='WEBP',
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        quality=70,
        method=6,
    )

    # Miniatura: recorta o fundo branco e centraliza num quadrado, para o
    # boneco preencher o círculo das listas.
    first = image.copy()
    first.seek(0)
    first = first.convert('RGB')
    background = Image.new('RGB', first.size, (255, 255, 255))
    box = ImageChops.difference(first, background).convert('L').point(
        lambda value: 255 if value > 20 else 0
    ).getbbox()
    if box:
        first = first.crop(box)
    side = max(first.size)
    square = Image.new('RGB', (side, side), (255, 255, 255))
    square.paste(first, ((side - first.width) // 2, (side - first.height) // 2))
    square = square.resize((THUMB_SIDE, THUMB_SIDE), Image.LANCZOS)
    square.save(thumb_path + '.tmp', format='WEBP', quality=80, method=6)
    os.replace(animation_path + '.tmp', animation_path)
    os.replace(thumb_path + '.tmp', thumb_path)


def convert_exercise(job):
    exercise, raw_dir, out_dir = job
    animation = os.path.join(out_dir, f"{exercise['slug']}.webp")
    thumb = os.path.join(out_dir, f"{exercise['slug']}.thumb.webp")
    if os.path.exists(animation) and os.path.exists(thumb):
        return 'skipped', None
    try:
        convert(os.path.join(raw_dir, f"{exercise['drive_id']}.gif"), animation, thumb)
        return 'done', None
    except Exception as error:  # noqa: BLE001 — relata e segue
        return 'failed', f"{exercise['slug']}: {error}"


def main():
    if len(sys.argv) != 3:
        sys.exit('Uso: python3 scripts/convert-gif-pack.py <raw_dir> <out_dir>')
    raw_dir, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    with open('supabase/seed/gif-pack.json', encoding='utf-8') as file:
        exercises = json.load(file)
    jobs = [(exercise, raw_dir, out_dir) for exercise in exercises]
    with ProcessPoolExecutor() as pool:
        results = list(pool.map(convert_exercise, jobs))
    done = sum(status == 'done' for status, _ in results)
    skipped = sum(status == 'skipped' for status, _ in results)
    failures = [failure for status, failure in results if status == 'failed']
    print(f'{done} convertidos, {skipped} já existiam, {len(failures)} falhas')
    for failure in failures:
        print(f'falha em {failure}')
    if failures:
        sys.exit(1)


if __name__ == '__main__':
    main()
