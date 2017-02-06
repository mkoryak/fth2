import buble from 'rollup-plugin-buble';
//import commonjs from 'rollup-plugin-commonjs';


export default {
	entry: 'src/index.js',
	dest: 'dist/bundle.js',
	format: 'cjs',
	moduleName: 'floatthead',
	plugins: [
		buble({
			include: [
				'src/**'
			],
			transforms: {
				dangerousForOf: true
			}
		})
	],
	sourceMap: false
};
