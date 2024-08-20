SHELL = /bin/bash

uuid = classic-dash@gnome.dev.jaylen.org
install-dir = ${HOME}/.local/share/gnome-shell/extensions/$(uuid)

generated-files = \
  schemas/gschemas.compiled

install-files = \
  $(wildcard *.js) $(wildcard src/*.js) $(wildcard *.css) $(wildcard *.json) \
  $(wildcard schemas/*.xml)
install-files += $(generated-files)

main: $(install-files)
	@echo "extension built successfully"

schemas/gschemas.compiled: schemas/org.gnome.shell.extensions.classic-dash.gschema.xml
	glib-compile-schemas --strict ./schemas/

install: $(install-files)
	mkdir -p $(install-dir)/schemas
	rm -rf $(install-dir)/*
	cp --parents $(install-files) $(install-dir)

clean:
	rm -vf $(generated-files)

.PHONY: clean main install
