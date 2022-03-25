{
  "targets": [
    {
      "target_name": "sbc",
	  "sources": ["main.cc", "sbc/sbc_primitives_neon.c", "sbc/sbc.c", "sbc/sbc_primitives.c", "sbc/sbc_primitives_armv6.c", "sbc/sbc_primitives_iwmmxt.c", "sbc/sbc_primitives_mmx.c"]
    }
  ]
}