import pkg from './package.json'
import buble from 'rollup-plugin-buble'

export default {
  input: 'src/index.js',
  output: [
    { file: pkg.umd, format: 'umd', name: 'WebRPC' },
    { file: pkg.main, format: 'cjs' },
    { file: pkg.module, format: 'es' }
  ],
  plugins: [
    buble()
  ]
}
