SHELL = /bin/bash

uuid = classic-dash@gnome.dev.jaylen.org
sid = org.gnome.shell.extensions.classic-dash
install-dir = ${HOME}/.local/share/gnome-shell/extensions/$(uuid)
remote =

generated-files = \
  schemas/gschemas.compiled \
  schemas/$(sid).gschema.xml

install-files = \
  $(wildcard *.js) $(wildcard src/*.js) $(wildcard *.css) $(wildcard *.json)
install-files += $(generated-files)

main:
	@echo 'extension built successfully'

schemas/gschemas.compiled: schemas/$(sid).gschema.xml | schemas
	glib-compile-schemas --strict ./schemas/

schemas/$(sid).gschema.xml: settings.js metadata.json
	gjs -m $< $(sid)

install: deploy.sh schemas/gschemas.compiled
ifeq ($(remote),)
	mkdir -p $(install-dir)/schemas
	rm -rf $(install-dir)/*
	cp --parents $(install-files) $(install-dir)
else
	bash $< $(uuid) $(remote)
endif

schemas:
	mkdir -p $@

clean:
	rm -vf schemas/*

.PHONY: clean main install
.SUFFIXES:
