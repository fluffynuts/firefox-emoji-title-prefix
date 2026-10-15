.PHONY: install test lint build run clean emoji-data

node_modules: package.json
	npm install
	@touch node_modules

install: node_modules

test:
	node --test "test/**/*.test.js"

lint: node_modules
	npx eslint .
	npx web-ext lint --source-dir src

build: test lint
	npx web-ext build --source-dir src --artifacts-dir dist --overwrite-dest

run: node_modules
	npx web-ext run --source-dir src

clean:
	rm -rf dist

emoji-data: node_modules
	node scripts/build-emoji-data.js
