import sys, glob
from PIL import Image, ImageDraw
src, dst = sys.argv[1], sys.argv[2]
fs = sorted(glob.glob(src + '/*.png'))
W, H = 480, 300
ims = []
for f in fs:
    im = Image.open(f).convert('RGB')
    H = int(W * im.height / im.width)
    ims.append((f.split('/')[-1], im.resize((W, H))))
cols = 4 if W * 4 < 2000 else 3
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (W * cols, (H + 16) * rows), 'black')
d = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(ims):
    x, y = (i % cols) * W, (i // cols) * (H + 16)
    sheet.paste(im, (x, y + 16))
    d.text((x + 4, y + 2), name, fill='white')
sheet.save(dst)
