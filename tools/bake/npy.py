"""Minimal stdlib reader for .npy / .npz (2D numeric arrays). No numpy needed."""
import ast, array, struct, sys, zipfile, io

_TC = {'i1': 'b', 'u1': 'B', 'i2': 'h', 'u2': 'H', 'i4': 'i', 'u4': 'I', 'i8': 'q', 'u8': 'Q', 'f4': 'f', 'f8': 'd'}

def read_npy(buf):
    """bytes -> (shape tuple, flat list of numbers). C-order only."""
    if buf[:6] != b'\x93NUMPY': raise ValueError('not an .npy file')
    major = buf[6]
    hlen, off = (struct.unpack('<H', buf[8:10])[0], 10) if major == 1 else (struct.unpack('<I', buf[8:12])[0], 12)
    hdr = ast.literal_eval(buf[off:off + hlen].decode('latin1'))
    if hdr.get('fortran_order'): raise ValueError('fortran-order arrays are not supported')
    descr = hdr['descr']; endian, code = descr[0], descr[1:]
    if code not in _TC: raise ValueError(f'unsupported dtype {descr}')
    a = array.array(_TC[code]); a.frombytes(buf[off + hlen:])
    if endian == '>' and sys.byteorder == 'little' or endian == '<' and sys.byteorder == 'big': a.byteswap()
    shape = tuple(hdr['shape']); n = 1
    for s in shape: n *= s
    if len(a) != n: raise ValueError(f'size mismatch {len(a)} vs {n}')
    return shape, a.tolist()

def read_npz(path):
    """path -> {name: (shape, flat list)}"""
    with zipfile.ZipFile(path) as z:
        return {n[:-4]: read_npy(z.read(n)) for n in z.namelist() if n.endswith('.npy')}

def write_npy(shape, values, code='f8'):
    """Used by tests to build fixtures without numpy."""
    hdr = f"{{'descr': '<{code}', 'fortran_order': False, 'shape': {tuple(shape)!r}, }}"
    hdr += ' ' * ((64 - (10 + len(hdr) + 1) % 64) % 64) + '\n'
    a = array.array(_TC[code], values)
    return b'\x93NUMPY\x01\x00' + struct.pack('<H', len(hdr)) + hdr.encode('latin1') + a.tobytes()
