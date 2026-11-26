# Bitwise Calculator

Interactive bitwise operations calculator supporting AND, OR, XOR, NOT, shifts and rotates with simultaneous binary, hex, decimal and octal display.

Live site: see the deployment section below.

## Features

- AND, OR, XOR and NOT operations on two operands (NOT uses operand A)
- Left/right shift and rotate operations with amounts wrapping modulo the bit width
- Simultaneous binary, hex, decimal and octal display for operands and result
- Per-bit toggling grid with carry-free editing — click any numbered bit cell
- Input parsing from any base (`0b` binary, `0x` hex, `0o` octal, or plain decimal)
- Bit width selector: 8/16/32/64-bit with overflow masking to the selected width
- Two-complement signed interpretation toggle, including sign-extending right shifts
- Share/permalink via URL-encoded state, localStorage autosave and image/PDF export
- 100% client-side — no data ever leaves your browser

## Usage

1. Pick an operation tab (AND, OR, XOR, NOT, SHL, SHR, ROL, ROR)
2. Enter operands in any base — `0xFF`, `0b1010`, `0o17` or `42`
3. Adjust the bit width in the toolbar and toggle the signed interpretation if needed
4. Toggle individual bits in the grid for carry-free editing
5. Read the result in all four bases and copy or save it to history

## Development

```bash
npm ci
npm run dev
```

Run the test suite and production build:

```bash
CI=true npm test -- --coverage
npm run build
```

## License

MIT — see [LICENSE](LICENSE).
