FUNCTIONS := WsConnectFunction WsDisconnectFunction WsMessageFunction GetTasksFunction GetTaskFunction CreateTaskFunction UpdateTaskFunction DeleteTaskFunction PublishTaskEventFunction
ROOT_PRISMA_CLIENT := $(abspath $(dir $(lastword $(MAKEFILE_LIST)))../node_modules/.prisma/client)

.PHONY: $(addprefix build-,$(FUNCTIONS))

define build_function
build-$(1):
	mkdir -p "$(ARTIFACTS_DIR)"
	cp -R dist package.json "$(ARTIFACTS_DIR)/"
	npm install --prefix "$(ARTIFACTS_DIR)" --omit=dev
	test -f "$(ROOT_PRISMA_CLIENT)/index.js"
	mkdir -p "$(ARTIFACTS_DIR)/node_modules/.prisma"
	cp -R "$(ROOT_PRISMA_CLIENT)" "$(ARTIFACTS_DIR)/node_modules/.prisma/"
endef

$(foreach function,$(FUNCTIONS),$(eval $(call build_function,$(function))))
