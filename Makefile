.PHONY: install test lint build src-zip run clean emoji-data

node_modules: package.json
	npm install
	@touch node_modules

install: node_modules

test:
	node --test "test/**/*.test.js"

lint: node_modules
	npx eslint .
	npx web-ext lint --source-dir src

build: test lint src-zip
	npx web-ext build --source-dir src --artifacts-dir dist --overwrite-dest

# AMO wants the source for anything generated; git archive packages exactly what is committed.
src-zip:
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "src-zip: uncommitted changes would make the source zip differ from the extension zip. Commit or stash them first:" >&2; \
		git status --short >&2; \
		exit 1; \
	fi
	mkdir -p dist
	git archive --format=zip --output="dist/emoji_tab_title-$$(node -p "require('./package.json').version")-src.zip" HEAD

run: node_modules
	npx web-ext run --source-dir src

clean:
	rm -rf dist

emoji-data: node_modules
	node scripts/build-emoji-data.js
