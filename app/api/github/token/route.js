import { NextResponse } from 'next/server'

import { githubFetch } from '@/lib/github'
import { createAdminClient } from '@/lib/supabase/client'

const TOKEN_VAULT_NAME = 'GITHUB_PAT'

export async function POST(request) {
  let token
  try {
    const body = await request.json()
    token = typeof body?.token === 'string' ? body.token.trim() : ''
  } catch {
    token = ''
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Paste a GitHub personal access token.' },
      { status: 400 },
    )
  }

  let viewer
  try {
    viewer = await githubFetch('/user', { token })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error?.status === 401
            ? 'GitHub rejected this token. Check that it is valid and not expired.'
            : error?.message || 'Could not validate the token.',
      },
      { status: 400 },
    )
  }

  try {
    const supabase = createAdminClient()
    const { data: existing, error: readError } = await supabase
      .from('env_vaults')
      .select('id')
      .eq('name', TOKEN_VAULT_NAME)
      .order('created_at', { ascending: false })
      .limit(1)

    if (readError) throw readError

    if (existing?.[0]?.id) {
      const { error } = await supabase
        .from('env_vaults')
        .update({
          value: token,
          description: 'GitHub personal access token used by the GitHub page',
        })
        .eq('id', existing[0].id)

      if (error) throw error
    } else {
      const { error } = await supabase.from('env_vaults').insert({
        name: TOKEN_VAULT_NAME,
        value: token,
        description: 'GitHub personal access token used by the GitHub page',
      })

      if (error) throw error
    }

    return NextResponse.json({
      ok: true,
      viewer: {
        login: viewer.login,
        avatarUrl: viewer.avatar_url,
      },
    })
  } catch (error) {
    console.error('POST /api/github/token failed:', error.message)
    return NextResponse.json(
      {
        error:
          'Could not save the token. Make sure the env_vaults table exists and the service key is configured.',
      },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('env_vaults')
      .delete()
      .eq('name', TOKEN_VAULT_NAME)

    if (error) throw error

    return NextResponse.json({
      ok: true,
      fallback: Boolean(process.env.GITHUB_PAT || process.env.GITHUB_TOKEN),
    })
  } catch (error) {
    console.error('DELETE /api/github/token failed:', error.message)
    return NextResponse.json(
      { error: 'Could not remove the saved token.' },
      { status: 500 },
    )
  }
}
