import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	ssr: {
		// Bundle axios so Vite resolves node:http2 away during build
		// (axios 1.13+ imports node:http2 in its http adapter, unavailable in workers)
		noExternal: ['axios'],
	},
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.toml' },
			},
		},
	},
});
