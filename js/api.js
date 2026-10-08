/* =====================================================================
   Classificação Final · api.js
   Conexão com o Supabase e funções de acesso aos dados.
   ===================================================================== */
(function () {
  'use strict';
  var C = window.CF_CONFIG;

  if (!window.supabase || !window.supabase.createClient) {
    throw new Error('Biblioteca do Supabase não carregada (vendor/supabase.js).');
  }

  var sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // 'implicit' permite abrir o link de confirmação/recuperação em outro aparelho
      flowType: 'implicit'
    }
  });

  // Endereço do próprio sistema (usado nos links enviados por e-mail)
  function enderecoDoSite() {
    return window.location.origin + window.location.pathname.replace(/index\.html$/, '');
  }

  // Mensagens de erro em português, claras para quem usa
  function traduzErro(erro) {
    if (!erro) return '';
    var msg = String(erro.message || erro.error_description || erro || '');
    var m = msg.toLowerCase();
    var status = erro.status;
    if (m.indexOf('failed to fetch') >= 0 || m.indexOf('networkerror') >= 0 || m.indexOf('load failed') >= 0)
      return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
    if (m.indexOf('invalid login credentials') >= 0) return 'E-mail ou senha incorretos.';
    if (m.indexOf('email not confirmed') >= 0)
      return 'Seu e-mail ainda não foi confirmado. Procure a mensagem de confirmação na caixa de entrada (e também no spam).';
    if (m.indexOf('already registered') >= 0 || m.indexOf('already been registered') >= 0)
      return 'Já existe um cadastro com este e-mail. Use "Entrar" ou "Esqueci minha senha".';
    if (status === 429 || m.indexOf('rate limit') >= 0 || m.indexOf('too many') >= 0)
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.';
    if (m.indexOf('password should be') >= 0 || m.indexOf('weak') >= 0)
      return 'A senha não atende aos requisitos. Use pelo menos ' + C.senhaMinima + ' caracteres, misturando letras e números.';
    if (m.indexOf('same password') >= 0 || m.indexOf('different from the old') >= 0)
      return 'A nova senha precisa ser diferente da senha atual.';
    if (m.indexOf('invalid email') >= 0 || m.indexOf('unable to validate email') >= 0)
      return 'E-mail inválido. Confira se digitou corretamente.';
    if (m.indexOf('expired') >= 0 || m.indexOf('otp') >= 0)
      return 'O link expirou ou já foi usado. Peça um novo.';
    if (m.indexOf('jwt') >= 0 || m.indexOf('session') >= 0)
      return 'Sua sessão expirou. Entre novamente.';
    if (m.indexOf('processo_testes_teste_id_fkey') >= 0)
      return 'Este teste já foi usado em um processo e não pode ser excluído. Em vez disso, desative o teste (Editar → Teste ativo).';
    if (m.indexOf('participacoes_turma_id_fkey') >= 0) return 'Esta turma tem jovens cadastrados. Mude os jovens de turma antes de excluí-la.';
    if (m.indexOf('processos_empresa_id_fkey') >= 0) return 'Esta empresa tem processos e não pode ser excluída. Inative a empresa.';
    if (m.indexOf('processo_cortes') >= 0 || m.indexOf('cortes_coerentes') >= 0) return 'A nota de backup precisa ser menor ou igual à de aprovado.';
    if (m.indexOf('row-level security') >= 0 || m.indexOf('permission denied') >= 0)
      return 'Você não tem permissão para esta ação.';
    if (/[áéíóúãõçê]/i.test(msg) && msg.length < 220 && !/violates|constraint|relation/i.test(msg)) return msg;
    return 'Não foi possível concluir a operação. (' + msg + ')';
  }

  async function carregarPerfil(usuarioId) {
    var campos = 'id, nome, email, perfil, empresa_id, aprovado, ativo';
    var r = await sb.from('perfis').select(campos + ', foto_path').eq('id', usuarioId).maybeSingle();
    // Se o banco ainda não tem a coluna da foto (script 09 não rodado), carrega sem ela
    if (r.error && /foto_path/.test(r.error.message || '')) {
      r = await sb.from('perfis').select(campos).eq('id', usuarioId).maybeSingle();
    }
    if (r.error) throw r.error;
    return r.data;
  }

  async function atualizarNome(usuarioId, nome) {
    var r = await sb.from('perfis').update({ nome: nome }).eq('id', usuarioId).select('id').single();
    if (r.error) throw r.error;
    return true;
  }

  window.CF.sb = sb;
  window.CF.api = { traduzErro: traduzErro, carregarPerfil: carregarPerfil, atualizarNome: atualizarNome, enderecoDoSite: enderecoDoSite };
})();
