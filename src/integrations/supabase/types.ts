export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      brand_knowledge: {
        Row: {
          brand_id: string
          content: string
          crawled_at: string
          id: string
          page_title: string | null
          source_url: string
        }
        Insert: {
          brand_id: string
          content?: string
          crawled_at?: string
          id?: string
          page_title?: string | null
          source_url: string
        }
        Update: {
          brand_id?: string
          content?: string
          crawled_at?: string
          id?: string
          page_title?: string | null
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_knowledge_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          featured: boolean
          gpsr_city: string | null
          gpsr_country: string | null
          gpsr_email: string | null
          gpsr_homepage: string | null
          gpsr_housenumber: string | null
          gpsr_postalcode: string | null
          gpsr_street: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          seo_text: string | null
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          featured?: boolean
          gpsr_city?: string | null
          gpsr_country?: string | null
          gpsr_email?: string | null
          gpsr_homepage?: string | null
          gpsr_housenumber?: string | null
          gpsr_postalcode?: string | null
          gpsr_street?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          seo_text?: string | null
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          featured?: boolean
          gpsr_city?: string | null
          gpsr_country?: string | null
          gpsr_email?: string | null
          gpsr_homepage?: string | null
          gpsr_housenumber?: string | null
          gpsr_postalcode?: string | null
          gpsr_street?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          seo_text?: string | null
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      cms_menu_items: {
        Row: {
          cms_page_id: string | null
          created_at: string
          id: string
          is_active: boolean
          label: string
          menu_id: string
          parent_id: string | null
          sort_order: number
          target: Database["public"]["Enums"]["cms_link_target"]
          type: Database["public"]["Enums"]["cms_menu_item_type"]
          updated_at: string
          url: string | null
        }
        Insert: {
          cms_page_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          menu_id: string
          parent_id?: string | null
          sort_order?: number
          target?: Database["public"]["Enums"]["cms_link_target"]
          type: Database["public"]["Enums"]["cms_menu_item_type"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          cms_page_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          menu_id?: string
          parent_id?: string | null
          sort_order?: number
          target?: Database["public"]["Enums"]["cms_link_target"]
          type?: Database["public"]["Enums"]["cms_menu_item_type"]
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_menu_items_cms_page_id_fkey"
            columns: ["cms_page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "cms_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cms_menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cms_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_menus: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          content: string
          created_at: string
          editor_mode: Database["public"]["Enums"]["cms_editor_mode"]
          id: string
          locale: string
          name: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["cms_page_status"]
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          editor_mode?: Database["public"]["Enums"]["cms_editor_mode"]
          id?: string
          locale?: string
          name: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["cms_page_status"]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          editor_mode?: Database["public"]["Enums"]["cms_editor_mode"]
          id?: string
          locale?: string
          name?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["cms_page_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      collection_facets_cache: {
        Row: {
          computed_at: string
          created_at: string
          handle: string
          id: string
          locale: string
          product_count: number
          properties: Json
          updated_at: string
          vendors: Json
        }
        Insert: {
          computed_at?: string
          created_at?: string
          handle: string
          id?: string
          locale?: string
          product_count?: number
          properties?: Json
          updated_at?: string
          vendors?: Json
        }
        Update: {
          computed_at?: string
          created_at?: string
          handle?: string
          id?: string
          locale?: string
          product_count?: number
          properties?: Json
          updated_at?: string
          vendors?: Json
        }
        Relationships: []
      }
      collection_seo_texts: {
        Row: {
          body: string
          created_at: string
          handle: string
          heading: string | null
          id: string
          locale: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          handle: string
          heading?: string | null
          id?: string
          locale?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          handle?: string
          heading?: string | null
          id?: string
          locale?: string
          updated_at?: string
        }
        Relationships: []
      }
      configurator_group_values: {
        Row: {
          description: string | null
          group_id: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_delta: number
          sku_hint: string | null
          sort_order: number
        }
        Insert: {
          description?: string | null
          group_id: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_delta?: number
          sku_hint?: string | null
          sort_order?: number
        }
        Update: {
          description?: string | null
          group_id?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_delta?: number
          sku_hint?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "configurator_group_values_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "configurator_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      configurator_groups: {
        Row: {
          created_at: string
          description: string | null
          field_type: Database["public"]["Enums"]["configurator_field_type"]
          id: string
          internal_name: string | null
          is_required: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          field_type?: Database["public"]["Enums"]["configurator_field_type"]
          id?: string
          internal_name?: string | null
          is_required?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          field_type?: Database["public"]["Enums"]["configurator_field_type"]
          id?: string
          internal_name?: string | null
          is_required?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      configurator_product_groups: {
        Row: {
          configurator_product_id: string
          group_id: string
          id: string
          is_required_override: boolean | null
          sort_order: number
        }
        Insert: {
          configurator_product_id: string
          group_id: string
          id?: string
          is_required_override?: boolean | null
          sort_order?: number
        }
        Update: {
          configurator_product_id?: string
          group_id?: string
          id?: string
          is_required_override?: boolean | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "configurator_product_groups_configurator_product_id_fkey"
            columns: ["configurator_product_id"]
            isOneToOne: false
            referencedRelation: "configurator_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "configurator_product_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "configurator_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      configurator_products: {
        Row: {
          created_at: string
          featured_image_url: string | null
          id: string
          shopify_handle: string
          shopify_product_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          featured_image_url?: string | null
          id?: string
          shopify_handle: string
          shopify_product_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          featured_image_url?: string | null
          id?: string
          shopify_handle?: string
          shopify_product_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_cards: {
        Row: {
          card_number: string | null
          created_at: string
          id: string
          notes: string | null
          shopify_customer_id: string
          status: string
          tier: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          card_number?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          shopify_customer_id: string
          status?: string
          tier?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          card_number?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          shopify_customer_id?: string
          status?: string
          tier?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      entity_paths: {
        Row: {
          canonical_key: string
          first_seen_at: string
          id: string
          is_current: boolean
          last_seen_at: string
          path: string
        }
        Insert: {
          canonical_key: string
          first_seen_at?: string
          id?: string
          is_current?: boolean
          last_seen_at?: string
          path: string
        }
        Update: {
          canonical_key?: string
          first_seen_at?: string
          id?: string
          is_current?: boolean
          last_seen_at?: string
          path?: string
        }
        Relationships: []
      }
      horse_profiles: {
        Row: {
          birth_year: number | null
          breed: string | null
          color: string | null
          created_at: string
          discipline: string | null
          external_id: string | null
          height_cm: number | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          shopify_customer_id: string
          training_level: number | null
          updated_at: string
        }
        Insert: {
          birth_year?: number | null
          breed?: string | null
          color?: string | null
          created_at?: string
          discipline?: string | null
          external_id?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          shopify_customer_id: string
          training_level?: number | null
          updated_at?: string
        }
        Update: {
          birth_year?: number | null
          breed?: string | null
          color?: string | null
          created_at?: string
          discipline?: string | null
          external_id?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          shopify_customer_id?: string
          training_level?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      news_article_products: {
        Row: {
          article_id: string
          id: string
          shopify_handle: string
          sort_order: number
        }
        Insert: {
          article_id: string
          id?: string
          shopify_handle: string
          sort_order?: number
        }
        Update: {
          article_id?: string
          id?: string
          shopify_handle?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "news_article_products_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "news_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_articles: {
        Row: {
          category: Database["public"]["Enums"]["news_category"]
          content: string
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          og_image_url: string | null
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["news_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["news_category"]
          content?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          og_image_url?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["news_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["news_category"]
          content?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          og_image_url?: string | null
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["news_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_property_display_config: {
        Row: {
          created_at: string
          display_order: number
          icon_generated_at: string | null
          icon_prompt: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          label: string
          shopify_key: string
          shopify_namespace: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon_generated_at?: string | null
          icon_prompt?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          label: string
          shopify_key: string
          shopify_namespace?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon_generated_at?: string | null
          icon_prompt?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          label?: string
          shopify_key?: string
          shopify_namespace?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      public_routes: {
        Row: {
          canonical_key: string
          current_path: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["redirect_entity_type"]
          id: string
          image_url: string | null
          is_public: boolean
          last_synced_at: string
          sku: string | null
          title: string
          updated_at: string
        }
        Insert: {
          canonical_key: string
          current_path: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["redirect_entity_type"]
          id?: string
          image_url?: string | null
          is_public?: boolean
          last_synced_at?: string
          sku?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          canonical_key?: string
          current_path?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["redirect_entity_type"]
          id?: string
          image_url?: string | null
          is_public?: boolean
          last_synced_at?: string
          sku?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      redirect_edges: {
        Row: {
          created_at: string
          from_path: string
          id: string
          redirect_id: string | null
          to_path: string
        }
        Insert: {
          created_at?: string
          from_path: string
          id?: string
          redirect_id?: string | null
          to_path: string
        }
        Update: {
          created_at?: string
          from_path?: string
          id?: string
          redirect_id?: string | null
          to_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "redirect_edges_redirect_id_fkey"
            columns: ["redirect_id"]
            isOneToOne: false
            referencedRelation: "redirects"
            referencedColumns: ["id"]
          },
        ]
      }
      redirect_hits: {
        Row: {
          day: string
          hits: number
          id: string
          new_path: string
          old_path: string
          redirect_id: string | null
        }
        Insert: {
          day?: string
          hits?: number
          id?: string
          new_path: string
          old_path: string
          redirect_id?: string | null
        }
        Update: {
          day?: string
          hits?: number
          id?: string
          new_path?: string
          old_path?: string
          redirect_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redirect_hits_redirect_id_fkey"
            columns: ["redirect_id"]
            isOneToOne: false
            referencedRelation: "redirects"
            referencedColumns: ["id"]
          },
        ]
      }
      redirect_issues: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          payload: Json | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["issue_severity"]
          status: Database["public"]["Enums"]["issue_status"]
          type: Database["public"]["Enums"]["issue_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          type: Database["public"]["Enums"]["issue_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          payload?: Json | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          type?: Database["public"]["Enums"]["issue_type"]
        }
        Relationships: []
      }
      redirect_staging: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          old_slug: string
          redirected_at: string | null
          resolved_at: string | null
          resolved_handle: string | null
          resolved_title: string | null
          sku: string
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          old_slug: string
          redirected_at?: string | null
          resolved_at?: string | null
          resolved_handle?: string | null
          resolved_title?: string | null
          sku: string
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          old_slug?: string
          redirected_at?: string | null
          resolved_at?: string | null
          resolved_handle?: string | null
          resolved_title?: string | null
          sku?: string
          status?: string
        }
        Relationships: []
      }
      redirects: {
        Row: {
          article_number: string | null
          canonical_key: string | null
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type:
            | Database["public"]["Enums"]["redirect_entity_type"]
            | null
          id: string
          is_active: boolean
          new_path: string | null
          new_url: string
          old_path: string | null
          old_url: string
          priority: number | null
          sku: string | null
          source: Database["public"]["Enums"]["redirect_source"] | null
          updated_at: string
        }
        Insert: {
          article_number?: string | null
          canonical_key?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["redirect_entity_type"]
            | null
          id?: string
          is_active?: boolean
          new_path?: string | null
          new_url: string
          old_path?: string | null
          old_url: string
          priority?: number | null
          sku?: string | null
          source?: Database["public"]["Enums"]["redirect_source"] | null
          updated_at?: string
        }
        Update: {
          article_number?: string | null
          canonical_key?: string | null
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["redirect_entity_type"]
            | null
          id?: string
          is_active?: boolean
          new_path?: string | null
          new_url?: string
          old_path?: string | null
          old_url?: string
          priority?: number | null
          sku?: string | null
          source?: Database["public"]["Enums"]["redirect_source"] | null
          updated_at?: string
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          id: string
          is_natural_language: boolean
          query: string
          result_count: number
          searched_at: string
        }
        Insert: {
          id?: string
          is_natural_language?: boolean
          query: string
          result_count?: number
          searched_at?: string
        }
        Update: {
          id?: string
          is_natural_language?: boolean
          query?: string
          result_count?: number
          searched_at?: string
        }
        Relationships: []
      }
      search_synonyms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          synonyms: string[]
          term: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          synonyms?: string[]
          term: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          synonyms?: string[]
          term?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopify_menu_cache: {
        Row: {
          handle: string
          id: string
          items: Json
          locale: string
          synced_at: string
          updated_at: string
        }
        Insert: {
          handle: string
          id?: string
          items?: Json
          locale?: string
          synced_at?: string
          updated_at?: string
        }
        Update: {
          handle?: string
          id?: string
          items?: Json
          locale?: string
          synced_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      ui_translations: {
        Row: {
          auto_generated: boolean
          created_at: string
          id: string
          key: string
          locale: string
          updated_at: string
          value: string
        }
        Insert: {
          auto_generated?: boolean
          created_at?: string
          id?: string
          key: string
          locale: string
          updated_at?: string
          value: string
        }
        Update: {
          auto_generated?: boolean
          created_at?: string
          id?: string
          key?: string
          locale?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_redirect_loop: {
        Args: { p_new_path: string; p_old_path: string }
        Returns: boolean
      }
      collapse_redirect_chains: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_url: { Args: { input: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
      cms_editor_mode: "standard" | "ai"
      cms_link_target: "_self" | "_blank"
      cms_menu_item_type:
        | "cms_page"
        | "custom_link"
        | "shopify_menu_placeholder"
      cms_page_status: "draft" | "active"
      configurator_field_type:
        | "text_input"
        | "dropdown_single"
        | "dropdown_multi"
        | "image_single"
        | "image_multi"
        | "checkbox"
        | "radio"
      issue_severity: "info" | "warning" | "critical"
      issue_status: "open" | "resolved" | "ignored"
      issue_type:
        | "loop_detected"
        | "chain_detected"
        | "duplicate_old_path"
        | "missing_target"
        | "import_sku_not_found"
        | "import_old_path_conflict"
      news_category: "horse_rider_news" | "produktnews" | "events"
      news_status: "draft" | "published"
      redirect_entity_type:
        | "product"
        | "collection"
        | "page"
        | "brand"
        | "news"
        | "custom"
      redirect_source:
        | "manual"
        | "import_csv"
        | "auto_url_change"
        | "migration_seed"
        | "system_collapse"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      cms_editor_mode: ["standard", "ai"],
      cms_link_target: ["_self", "_blank"],
      cms_menu_item_type: [
        "cms_page",
        "custom_link",
        "shopify_menu_placeholder",
      ],
      cms_page_status: ["draft", "active"],
      configurator_field_type: [
        "text_input",
        "dropdown_single",
        "dropdown_multi",
        "image_single",
        "image_multi",
        "checkbox",
        "radio",
      ],
      issue_severity: ["info", "warning", "critical"],
      issue_status: ["open", "resolved", "ignored"],
      issue_type: [
        "loop_detected",
        "chain_detected",
        "duplicate_old_path",
        "missing_target",
        "import_sku_not_found",
        "import_old_path_conflict",
      ],
      news_category: ["horse_rider_news", "produktnews", "events"],
      news_status: ["draft", "published"],
      redirect_entity_type: [
        "product",
        "collection",
        "page",
        "brand",
        "news",
        "custom",
      ],
      redirect_source: [
        "manual",
        "import_csv",
        "auto_url_change",
        "migration_seed",
        "system_collapse",
      ],
    },
  },
} as const
